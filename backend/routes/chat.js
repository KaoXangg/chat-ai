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

const router = express.Router();
router.use(authMiddleware);

const MAX_HISTORY_MESSAGES = 20;
const MAX_IMAGE_BASE64_LENGTH = 9_000_000;
const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_MESSAGE_LENGTH = 32_000;
const SYSTEM_PROMPT = "Bạn là Chat AI, một trợ lý AI thông minh. Hãy trả lời ngắn gọn, chính xác và hữu ích. Khi trả lời bằng tiếng Việt, luôn dùng đầy đủ dấu tiếng Việt. Khi viết mã, hãy dùng khối mã Markdown và ghi rõ ngôn ngữ. Khi viết công thức toán, dùng LaTeX: $...$ cho công thức trong dòng và $$...$$ cho công thức riêng một dòng.";

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
  res.write(`data: ${JSON.stringify(data)}\n\n`);
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

async function buildHistory(conversationId, extraContext = "") {
  const history = await Message.findAll({
    where: { conversationId },
    order: [["createdAt", "DESC"]],
    limit: MAX_HISTORY_MESSAGES,
  });
  history.reverse();

  const systemContent = extraContext ? `${SYSTEM_PROMPT}\n\n${extraContext}` : SYSTEM_PROMPT;

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
async function getWebContext(useWebSearch, query) {
  if (!useWebSearch || !isWebSearchConfigured()) return { webSources: [], webContext: "" };
  try {
    const webSources = await searchWeb(query);
    if (!webSources.length) return { webSources: [], webContext: "" };
    const webContext =
      "Dưới đây là thông tin tìm kiếm được trên web, hãy dùng để trả lời chính xác và trích dẫn nguồn theo dạng [số] khi phù hợp:\n\n" +
      webSources.map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.content}`).join("\n\n");
    return { webSources, webContext };
  } catch (err) {
    console.error("[Web Search] Lỗi:", err.message);
    return { webSources: [], webContext: "" };
  }
}

/**
 * Stream câu trả lời của AI qua SSE.
 * `userMessageId` (nếu có) được gửi kèm sự kiện `done`/`error` để client thay id tạm của tin nhắn người dùng
 * bằng id thật (cần cho tính năng sửa tin nhắn).
 */
async function runStream(req, res, conversation, messagesForAI, { webSources = [], userMessageId = null } = {}) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let fullResponse = "";
  let usedProvider = conversation.provider;
  let usedModel = conversation.model;
  let usage = null;
  const userId = userMessageId !== null && userMessageId !== undefined ? String(userMessageId) : undefined;

  try {
    const catalog = await loadModelCatalog();
    // Model mà người dùng đã dùng hết hạn mức token hôm nay sẽ bị router bỏ qua.
    const excludedModels = await getExhaustedModels(req.user.id, catalog);
    for await (const item of streamWithFallback(messagesForAI, conversation.provider, conversation.model, { catalog, excludedModels })) {
      usedProvider = item.provider;
      usedModel = item.model;
      if (item.usage) {
        usage = item.usage;
        continue;
      }
      fullResponse += item.token;
      sseSend(res, { token: item.token });
    }

    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: "assistant",
      content: fullResponse,
      provider: usedProvider,
      model: usedModel,
      sources: webSources.length ? webSources : null,
    });

    await conversation.save();
    await recordUsage({ userId: req.user.id, provider: usedProvider, modelId: usedModel, usage });

    sseSend(res, {
      done: true,
      messageId: assistantMessage._id,
      userMessageId: userId,
      provider: usedProvider,
      model: usedModel,
      sources: assistantMessage.sources,
    });
  } catch (err) {
    console.error("[Chat Stream] Lỗi:", err.message);
    // Câu trả lời dở dang vẫn đã tiêu tốn token -> ghi nhận bản ước lượng.
    if (err.usage) {
      await recordUsage({ userId: req.user.id, provider: err.provider || usedProvider, modelId: err.model || usedModel, usage: err.usage });
    }
    if (fullResponse) {
      try {
        await Message.create({
          conversationId: conversation.id,
          role: "assistant",
          content: fullResponse,
          provider: usedProvider,
          model: usedModel,
          isError: true,
        });
      } catch (saveErr) {
        console.error("[Chat Stream] Không thể lưu câu trả lời dở dang:", saveErr.message);
      }
    }
    const code = STREAM_ERROR_MESSAGES[err.code] ? err.code : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    const message =
      code === AI_ERROR_CODES.QUOTA_EXCEEDED
        ? `${STREAM_ERROR_MESSAGES[code]} Hạn mức làm mới lúc 00:00 (${getTzLabel()}); bạn cũng có thể chọn mô hình khác.`
        : STREAM_ERROR_MESSAGES[code];
    sseSend(res, { error: message, code, userMessageId: userId });
  } finally {
    res.end();
  }
}

router.post("/:conversationId/stream", chatLimiter, async (req, res, next) => {
  try {
    const { content, image, images, useWebSearch } = req.body;
    if (!content || !content.trim()) {
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
      if (conversation.provider !== "gemini") {
        return jsonError(res, 400, "IMAGE_NOT_SUPPORTED", "Chỉ mô hình Gemini hỗ trợ phân tích hình ảnh. Vui lòng chọn Gemini.");
      }
      for (const img of imageList) {
        if (!img?.data || !img?.mimeType || img.data.length > MAX_IMAGE_BASE64_LENGTH) {
          return jsonError(res, 400, "INVALID_IMAGE", "Có ảnh không hợp lệ hoặc quá lớn (tối đa 6MB mỗi ảnh).");
        }
      }
    }

    const userMessage = await Message.create({
      conversationId: conversation.id,
      role: "user",
      content: content.trim(),
      imageBase64: imageList[0]?.data || null,
      imageMimeType: imageList[0]?.mimeType || null,
      images: imageList.length ? imageList : null,
    });

    if (["Cuoc tro chuyen moi", "Cuộc trò chuyện mới"].includes(conversation.title)) {
      conversation.title = await generateConversationTitle(content.trim());
    }

    const { webSources, webContext } = await getWebContext(useWebSearch, content.trim());
    const messagesForAI = await buildHistory(conversation.id, webContext);
    await runStream(req, res, conversation, messagesForAI, { webSources, userMessageId: userMessage.id });
  } catch (err) {
    next(err);
  }
});

router.post("/:conversationId/regenerate", chatLimiter, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.conversationId, userId: req.user.id } });
    if (!conversation) {
      return jsonError(res, 404, "NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
    }

    const lastMessage = await Message.findOne({ where: { conversationId: conversation.id }, order: [["createdAt", "DESC"]] });
    if (lastMessage && lastMessage.role === "assistant") {
      await lastMessage.destroy();
    }

    const messagesForAI = await buildHistory(conversation.id);
    await runStream(req, res, conversation, messagesForAI);
  } catch (err) {
    next(err);
  }
});

/**
 * Sửa một tin nhắn của người dùng và gửi lại:
 * cập nhật nội dung tin nhắn, xóa toàn bộ tin nhắn phía sau nó, rồi stream câu trả lời mới.
 * Ảnh đính kèm của tin nhắn gốc được giữ nguyên.
 */
router.post("/:conversationId/edit/:messageId", chatLimiter, async (req, res, next) => {
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
    });

    const { webSources, webContext } = await getWebContext(req.body.useWebSearch, content);
    const messagesForAI = await buildHistory(conversation.id, webContext);
    await runStream(req, res, conversation, messagesForAI, { webSources, userMessageId: target.id });
  } catch (err) {
    next(err);
  }
});

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