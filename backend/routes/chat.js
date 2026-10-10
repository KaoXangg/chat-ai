import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import AIModel from "../models/AIModel.js";
import { getExhaustedModels, recordUsage, getTzLabel } from "../utils/quota.js";
import { authMiddleware } from "../middleware/auth.js";
import { chatLimiter } from "../middleware/rateLimit.js";
import { streamWithFallback, generateConversationTitle, AI_ERROR_CODES } from "../providers/aiRouter.js";
import { searchWeb, isWebSearchConfigured } from "../providers/webSearch.js";
import { aiLanguageDirective } from "../utils/languages.js";
import { serializeChat } from "../utils/chatLock.js";
import { validateIdParam } from "../utils/validation.js";

const router = express.Router();
router.use(authMiddleware);
router.param("conversationId", validateIdParam);
router.param("messageId", validateIdParam);
router.use((req, res, next) => {
  const controller = new AbortController();
  req.chatSignal = controller.signal;
  if (res.destroyed) controller.abort();
  const abort = () => controller.abort();
  res.once("close", abort);
  res.once("finish", () => res.off("close", abort));
  next();
});

const MAX_HISTORY_MESSAGES = 20;
const MAX_IMAGE_BASE64_LENGTH = 9_000_000;
const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_MESSAGE_LENGTH = 32_000;
const SYSTEM_PROMPT =
  "You are Chat AI, a smart AI assistant. Answer concisely, accurately and helpfully. " +
  "Always reply in the same language as the user's latest message, unless the user explicitly asks for another language. " +
  "When replying in Vietnamese, always use full Vietnamese diacritics. " +
  "When writing code, use Markdown code blocks and specify the language. " +
  "For math, use LaTeX: $...$ for inline formulas and $$...$$ for display formulas.";

const STREAM_ERROR_MESSAGES = {
  [AI_ERROR_CODES.RATE_LIMITED]: "Model miễn phí đang bị giới hạn tốc độ hoặc hết lượt tạm thời. Hãy đợi vài giây rồi thử lại, hoặc chọn model khác.",
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: "Bạn đã dùng hết hạn mức token hôm nay của các mô hình khả dụng.",
  [AI_ERROR_CODES.PROVIDER_UNAVAILABLE]: "Không thể kết nối với AI lúc này. Vui lòng thử lại.",
};

/** Danh sách model đang bật (kèm priority, contextLength, capabilities) để router chọn model và fallback. */
async function loadModelCatalog() {
  const models = await AIModel.findAll({ where: { enabled: true } });
  return models.map((m) => m.toJSON());
}

function sseSend(res, data) {
  if (!res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function startSSE(res, userMessageId) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  sseSend(res, { started: true, userMessageId: userMessageId == null ? undefined : String(userMessageId) });
}

async function touchConversation(conversation, transaction) {
  conversation.setDataValue("updatedAt", new Date());
  conversation.changed("updatedAt", true);
  await conversation.save({ transaction });
}

function jsonError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}

/** Normalizes either the legacy singular `image` field or the new `images` array into one array. */
function normalizeImages(image, images) {
  if (Array.isArray(images) && images.length) return images.slice(0, MAX_IMAGES_PER_MESSAGE);
  if (image) return [image];
  return [];
}

async function buildHistory(conversationId, extraContext = "", aiLanguage = "auto", lastUserMessageId = null) {
  const history = await Message.findAll({
    where: { conversationId, ...(lastUserMessageId ? { id: { [Op.lte]: lastUserMessageId } } : {}) },
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit: MAX_HISTORY_MESSAGES,
  });
  history.reverse();

  // Ngôn ngữ trả lời do người dùng chọn (Users.aiLanguage); "auto" thì AI tự theo ngôn ngữ tin nhắn.
  const systemContent = [SYSTEM_PROMPT, aiLanguageDirective(aiLanguage), extraContext].filter(Boolean).join("\n\n");

  return [
    { role: "system", content: systemContent },
    ...history.map((m) => {
      const imgs = m.images?.length ? m.images : m.imageBase64 ? [{ mimeType: m.imageMimeType, data: m.imageBase64 }] : [];
      return {
        role: m.role,
        content: m.content,
        images: imgs.length ? imgs : undefined,
        // kept for any provider code that still reads the singular field
        image: imgs[0],
      };
    }),
  ];
}

/** Tìm kiếm web (nếu được bật) và dựng đoạn ngữ cảnh gắn vào system prompt. */
async function getWebContext(useWebSearch, query, signal) {
  if (!useWebSearch || !isWebSearchConfigured()) return { webSources: [], webContext: "" };
  try {
    const webSources = await searchWeb(query, 5, { signal });
    if (!webSources.length) return { webSources: [], webContext: "" };
    const webContext =
      "Dưới đây là thông tin tìm kiếm được trên web, hãy dùng để trả lời chính xác và trích dẫn nguồn theo dạng [số] khi phù hợp:\n\n" +
      webSources.map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.content}`).join("\n\n");
    return { webSources, webContext };
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error("[Web Search] Lỗi:", err.message);
    return { webSources: [], webContext: "" };
  }
}

/**
 * Stream câu trả lời của AI qua SSE.
 * `userMessageId` (nếu có) được gửi kèm sự kiện `done`/`error` để client thay id tạm của tin nhắn người dùng
 * bằng id thật (cần cho tính năng sửa tin nhắn).
 */
async function runStream(req, res, conversation, messagesForAI, { webSources = [], userMessageId = null, replaceMessageId = null, replaceAfterId = null } = {}) {
  const signal = req.chatSignal;
  if (signal.aborted || res.destroyed) return;

  let fullResponse = "";
  let usedProvider = conversation.provider;
  let usedModel = conversation.model;
  let usage = null;
  let assistantMessage = null;
  let usageRecorded = false;
  const userId = userMessageId !== null && userMessageId !== undefined ? String(userMessageId) : undefined;
  try {
    startSSE(res, userMessageId);
    // Acknowledge durable mutations before any title, web-search or history preparation.
    if (typeof messagesForAI === "function") {
      const prepared = await messagesForAI();
      messagesForAI = prepared.messages;
      webSources = prepared.webSources;
    }
    const catalog = await loadModelCatalog();
    // Model mà người dùng đã dùng hết hạn mức token hôm nay sẽ bị router bỏ qua.
    const excludedModels = await getExhaustedModels(req.user.id, catalog);
    for await (const item of streamWithFallback(messagesForAI, conversation.provider, conversation.model, { catalog, excludedModels, signal })) {
      usedProvider = item.provider;
      usedModel = item.model;
      if (item.usage) {
        usage = item.usage;
        continue;
      }
      fullResponse += item.token;
      sseSend(res, { token: item.token });
    }

    signal.throwIfAborted();
    assistantMessage = await sequelize.transaction(async (transaction) => {
      const replacement = await Message.create({
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
        provider: usedProvider,
        model: usedModel,
        sources: webSources.length ? webSources : null,
      }, { transaction });
      if (replaceMessageId) {
        await Message.destroy({
          where: { conversationId: conversation.id, role: "assistant", id: { [Op.gt]: replaceAfterId, [Op.lte]: replaceMessageId } },
          transaction,
        });
      }
      await touchConversation(conversation, transaction);
      await recordUsage({ userId: req.user.id, provider: usedProvider, modelId: usedModel, usage }, { transaction, strict: true });
      return replacement;
    });

    usageRecorded = true;

    sseSend(res, {
      done: true,
      messageId: assistantMessage._id,
      userMessageId: userId,
      provider: usedProvider,
      model: usedModel,
      sources: assistantMessage.sources,
      replacedMessageId: replaceMessageId ? String(replaceMessageId) : undefined,
      replacedAfterId: replaceMessageId ? replaceAfterId : undefined,
    });
  } catch (err) {
    const interrupted = signal.aborted || err.name === "AbortError";
    if (!interrupted) console.error("[Chat Stream] Lỗi:", err.message);
    // Câu trả lời dở dang vẫn đã tiêu tốn token -> ghi nhận bản ước lượng.
    if (!usageRecorded && (err.usage || usage)) {
      await recordUsage({ userId: req.user.id, provider: err.provider || usedProvider, modelId: err.model || usedModel, usage: err.usage || usage });
    }
    if (fullResponse && !assistantMessage) {
      try {
        assistantMessage = await Message.create({
          conversationId: conversation.id,
          role: "assistant",
          content: fullResponse,
          provider: usedProvider,
          model: usedModel,
          isError: !interrupted,
          interrupted: true,
          sources: webSources.length ? webSources : null,
        });
      } catch (saveErr) {
        console.error("[Chat Stream] Không thể lưu câu trả lời dở dang:", saveErr.message);
      }
    }
    if (interrupted) return;
    const code = STREAM_ERROR_MESSAGES[err.code] ? err.code : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    const message =
      code === AI_ERROR_CODES.QUOTA_EXCEEDED
        ? `${STREAM_ERROR_MESSAGES[code]} Hạn mức làm mới lúc 00:00 (${getTzLabel()}); bạn cũng có thể chọn mô hình khác.`
        : STREAM_ERROR_MESSAGES[code];
    sseSend(res, { error: message, code, userMessageId: userId, messageId: assistantMessage?._id, interrupted: Boolean(fullResponse) });
  } finally {
    if (!res.destroyed && !res.writableEnded) res.end();
  }
}

router.post("/:conversationId/stream", chatLimiter, serializeChat(async (req, res, next) => {
  try {
    const { content, image, images, useWebSearch, requestId } = req.body;
    if (images !== undefined && (!Array.isArray(images) || images.length > MAX_IMAGES_PER_MESSAGE)) {
      return jsonError(res, 400, "INVALID_IMAGE", "Chỉ được gửi tối đa 4 ảnh mỗi tin nhắn.");
    }
    if (requestId !== undefined && (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(requestId))) {
      return jsonError(res, 400, "INVALID_INPUT", "Mã yêu cầu không hợp lệ.");
    }
    if (typeof content !== "string" || !content.trim()) {
      return jsonError(res, 400, "EMPTY_MESSAGE", "Nội dung không được để trống.");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return jsonError(res, 400, "MESSAGE_TOO_LONG", `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).`);
    }

    const conversation = await Conversation.findOne({ where: { id: req.params.conversationId, userId: req.user.id } });
    if (!conversation) {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
    }

    const imageList = normalizeImages(image, images);

    if (imageList.length) {
      // Quyết định theo capability "vision" của model đang chọn (admin cấu hình), không hard-code theo provider.
      const selected = await AIModel.findOne({
        where: { provider: conversation.provider, modelId: conversation.model, enabled: true },
      });
      const canSeeImages = selected?.capabilities?.includes("vision");
      if (!canSeeImages) {
        return jsonError(res, 400, "IMAGE_NOT_SUPPORTED", "Mô hình đang chọn không hỗ trợ phân tích hình ảnh. Hãy chọn mô hình có nhãn Vision.");
      }
      for (const img of imageList) {
        if (typeof img?.data !== "string" || !img.data || typeof img.mimeType !== "string"
          || !/^image\/(png|jpeg|jpg|gif|webp|heic|heif|avif)$/i.test(img.mimeType)
          || img.data.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(img.data)
          || Buffer.byteLength(img.data, "base64") > 6 * 1024 * 1024) {
          return jsonError(res, 400, "INVALID_IMAGE", "Có ảnh không hợp lệ hoặc quá lớn (tối đa 6MB mỗi ảnh).");
        }
      }
    }

    let userMessage = requestId && await Message.findOne({ where: { conversationId: conversation.id, role: "user", requestId } });
    let replacement = null;
    if (userMessage) {
      if (userMessage.content !== content.trim()) return jsonError(res, 409, "INVALID_INPUT", "Mã yêu cầu đã dùng cho nội dung khác.");
      const nextQuestion = await Message.findOne({
        where: { conversationId: conversation.id, role: "user", id: { [Op.gt]: userMessage.id } }, order: [["id", "ASC"]],
      });
      replacement = await Message.findOne({
        where: { conversationId: conversation.id, role: "assistant", id: { [Op.gt]: userMessage.id, ...(nextQuestion ? { [Op.lt]: nextQuestion.id } : {}) } },
        order: [["id", "DESC"]],
      });
      if (replacement && !replacement.interrupted && !replacement.isError) {
        startSSE(res, userMessage.id);
        sseSend(res, { token: replacement.content });
        sseSend(res, { done: true, messageId: replacement._id, userMessageId: userMessage._id, provider: replacement.provider, model: replacement.model, sources: replacement.sources });
        return res.end();
      }
      if (nextQuestion) return jsonError(res, 409, "REQUEST_ALREADY_PROCESSED", "Tin nhắn đã được lưu. Hãy tải lại hội thoại.");
    } else {
      userMessage = await sequelize.transaction(async (transaction) => {
        const message = await Message.create({
          conversationId: conversation.id, requestId: requestId || null,
          role: "user", content: content.trim(),
          imageBase64: imageList[0]?.data || null,
          imageMimeType: imageList[0]?.mimeType || null,
          images: imageList.length ? imageList : null,
        }, { transaction });
        await touchConversation(conversation, transaction);
        return message;
      });
    }
    req.chatMutation = { persisted: true, userMessageId: String(userMessage.id) };
    await runStream(req, res, conversation, async () => {
      if (["Cuoc tro chuyen moi", "Cuộc trò chuyện mới"].includes(conversation.title)) {
        conversation.title = await generateConversationTitle(content.trim(), { signal: req.chatSignal });
        await touchConversation(conversation);
      }
      const { webSources, webContext } = await getWebContext(useWebSearch, content.trim(), req.chatSignal);
      return { webSources, messages: await buildHistory(conversation.id, webContext, req.user.aiLanguage, userMessage.id) };
    }, { userMessageId: userMessage.id, replaceMessageId: replacement?.id, replaceAfterId: userMessage.id });
  } catch (err) {
    if (req.chatSignal.aborted) return;
    next(err);
  }
}));

router.post("/:conversationId/regenerate", chatLimiter, serializeChat(async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.conversationId, userId: req.user.id } });
    if (!conversation) {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
    }

    const lastMessage = await Message.findOne({ where: { conversationId: conversation.id }, order: [["createdAt", "DESC"], ["id", "DESC"]] });
    const lastUserMessage = await Message.findOne({ where: { conversationId: conversation.id, role: "user" }, order: [["createdAt", "DESC"], ["id", "DESC"]] });
    if (!lastUserMessage) return jsonError(res, 400, "EMPTY_MESSAGE", "Không có tin nhắn để tạo lại câu trả lời.");
    const replaceMessageId = lastMessage?.role === "assistant" && lastMessage.id > lastUserMessage.id ? lastMessage.id : null;
    const messagesForAI = await buildHistory(conversation.id, "", req.user.aiLanguage, lastUserMessage.id);
    await runStream(req, res, conversation, messagesForAI, { replaceMessageId, replaceAfterId: lastUserMessage.id });
  } catch (err) {
    next(err);
  }
}));

/**
 * Sửa một tin nhắn của người dùng và gửi lại:
 * cập nhật nội dung tin nhắn, xóa toàn bộ tin nhắn phía sau nó, rồi stream câu trả lời mới.
 * Ảnh đính kèm của tin nhắn gốc được giữ nguyên.
 */
router.post("/:conversationId/edit/:messageId", chatLimiter, serializeChat(async (req, res, next) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return jsonError(res, 400, "EMPTY_MESSAGE", "Nội dung không được để trống.");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return jsonError(res, 400, "MESSAGE_TOO_LONG", `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).`);
    }

    const conversation = await Conversation.findOne({ where: { id: req.params.conversationId, userId: req.user.id } });
    if (!conversation) {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
    }

    const target = await Message.findOne({ where: { id: req.params.messageId, conversationId: conversation.id } });
    if (!target || target.role !== "user") {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy tin nhắn cần sửa.");
    }

    await sequelize.transaction(async (transaction) => {
      await Message.destroy({
        where: { conversationId: conversation.id, id: { [Op.gt]: target.id } },
        transaction,
      });
      target.content = content;
      await target.save({ transaction });
      await touchConversation(conversation, transaction);
    });
    req.chatMutation = { persisted: true, userMessageId: String(target.id) };
    await runStream(req, res, conversation, async () => {
      const { webSources, webContext } = await getWebContext(req.body.useWebSearch, content, req.chatSignal);
      return { webSources, messages: await buildHistory(conversation.id, webContext, req.user.aiLanguage, target.id) };
    }, { userMessageId: target.id });
  } catch (err) {
    next(err);
  }
}));

router.patch("/message/:messageId/feedback", async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (![null, "like", "dislike"].includes(feedback)) {
      return jsonError(res, 400, "INVALID_FEEDBACK", "Giá trị đánh giá không hợp lệ.");
    }

    const message = await Message.findByPk(req.params.messageId);
    if (!message) {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy tin nhắn.");
    }

    const conversation = await Conversation.findOne({ where: { id: message.conversationId, userId: req.user.id } });
    if (!conversation) {
      return jsonError(res, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }

    message.feedback = feedback;
    await message.save();
    res.json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
});

export default router;
