import express from "express";
import crypto from "node:crypto";
import { Op, literal } from "sequelize";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/auth.js";
import { serializeConversationMutation } from "../utils/chatLock.js";
import { sequelize } from "../config/db.js";
import { escapeLike, invalidInput, validateIdParam } from "../utils/validation.js";

const router = express.Router();
router.use(authMiddleware);
router.param("id", validateIdParam);
router.param("messageId", validateIdParam);

function validateConversationFields({ title, pinned, provider, model }) {
  if (title !== undefined && typeof title !== "string") throw invalidInput("Tiêu đề không hợp lệ.");
  if (pinned !== undefined && typeof pinned !== "boolean") throw invalidInput("Trạng thái ghim không hợp lệ.");
  if (provider !== undefined && !["groq", "gemini", "openrouter"].includes(provider)) throw invalidInput("Nhà cung cấp không hợp lệ.");
  if (model !== undefined && (typeof model !== "string" || !model.trim() || model.length > 150)) throw invalidInput("Mô hình không hợp lệ.");
}

// GET /api/conversations?search=... -> danh sách cuộc trò chuyện của người dùng, ưu tiên mục đã ghim.
router.get("/", async (req, res, next) => {
  try {
    const { search } = req.query;
    if (search !== undefined && (typeof search !== "string" || search.length > 120)) throw invalidInput("Từ khóa tìm kiếm không hợp lệ.");
    const where = { userId: req.user.id };
    if (search) where.title = { [Op.like]: `%${escapeLike(search)}%` };

    const conversations = await Conversation.findAll({
      where,
      order: [
        ["pinned", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });
    res.json({ success: true, data: { conversations } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/conversations/search-messages?q=...
 * Tìm kiếm từ khóa sâu trong toàn bộ nội dung tin nhắn của người dùng.
 */
router.get("/search-messages", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) {
      return res.json({ success: true, data: { results: [] } });
    }
    if (q.length > 100) {
      return res.status(400).json({ success: false, error: { code: "INVALID_QUERY", message: "Từ khóa tìm kiếm quá dài." } });
    }

    const conversations = await Conversation.findAll({
      where: { userId: req.user.id },
      attributes: ["id", "title"],
    });
    const convMap = new Map(conversations.map((c) => [c.id, c.title]));
    const convIds = Array.from(convMap.keys());

    if (!convIds.length) {
      return res.json({ success: true, data: { results: [] } });
    }

    const messages = await Message.findAll({
      where: {
        conversationId: { [Op.in]: convIds },
        content: { [Op.like]: `%${escapeLike(q)}%` },
      },
      attributes: ["id", "conversationId", "role", "content", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    const results = messages.map((m) => ({
      messageId: String(m.id),
      conversationId: String(m.conversationId),
      conversationTitle: convMap.get(m.conversationId) || "Cuộc trò chuyện",
      role: m.role,
      contentSnippet: m.content.slice(0, 160),
      createdAt: m.createdAt,
    }));

    res.json({ success: true, data: { results } });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { provider = "openrouter", model = "openrouter/free" } = req.body;
    validateConversationFields({ provider, model });
    const conversation = await Conversation.create({
      userId: req.user.id,
      provider,
      model,
    });
    res.status(201).json({ success: true, data: { conversation } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/messages", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    const rows = await Message.findAll({
      where: { conversationId: conversation.id },
      attributes: {
        exclude: ["imageBase64", "images"],
        include: [[literal(`COALESCE(NULLIF((SELECT COUNT(*) FROM OPENJSON(CASE WHEN ISJSON([images]) = 1 THEN [images] ELSE N'[]' END)), 0), CASE WHEN [imageBase64] IS NOT NULL THEN 1 ELSE 0 END)`), "imageCount"]],
      },
      order: [["createdAt", "ASC"], ["id", "ASC"]],
    });
    const messages = rows.map((row) => {
      const message = row.toJSON();
      const count = Number(message.imageCount) || 0;
      // These URLs require the same bearer authentication as the message list.
      message.images = Array.from({ length: count }, (_, index) => ({
        url: `/conversations/${conversation.id}/messages/${message.id}/images/${index}`,
      }));
      delete message.imageBase64;
      return message;
    });
    res.json({ success: true, data: { conversation, messages } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/messages/:messageId/images/:index", async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    if (!/^\d+$/.test(req.params.index) || !Number.isSafeInteger(index) || index > 3) {
      return res.status(400).json({ success: false, error: { code: "INVALID_IMAGE", message: "Ảnh không hợp lệ." } });
    }
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    const message = conversation && await Message.findOne({ where: { id: req.params.messageId, conversationId: conversation.id } });
    const images = message?.images?.length ? message.images : message?.imageBase64
      ? [{ mimeType: message.imageMimeType, data: message.imageBase64 }] : [];
    const image = images[index];
    if (!image?.data || !/^image\/(png|jpeg|jpg|gif|webp|heic|heif|avif)$/i.test(image.mimeType)) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy ảnh." } });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(image.mimeType).send(Buffer.from(image.data, "base64"));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", serializeConversationMutation(async (req, res, next) => {
  try {
    const { title, pinned, provider, model, folderId } = req.body;
    validateConversationFields({ title, pinned, provider, model });
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }

    if (title !== undefined) conversation.title = title.trim().slice(0, 120) || "Cuộc trò chuyện mới";
    if (pinned !== undefined) conversation.pinned = Boolean(pinned);
    if (provider !== undefined) conversation.provider = provider;
    if (model !== undefined) conversation.model = model;
    if (folderId !== undefined) conversation.folderId = folderId ? Number(folderId) : null;

    await conversation.save();
    res.json({ success: true, data: { conversation } });
  } catch (err) {
    next(err);
  }
}));

/**
 * POST /api/conversations/:id/fork
 * Phân nhánh cuộc trò chuyện từ một tin nhắn cụ thể
 */
router.post("/:id/fork", serializeConversationMutation(async (req, res, next) => {
  try {
    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Thiếu ID tin nhắn cần tách nhánh." } });
    }

    const originalConv = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!originalConv) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện gốc." } });
    }

    const allMessages = await Message.findAll({
      where: { conversationId: originalConv.id },
      order: [["createdAt", "ASC"], ["id", "ASC"]],
    });

    const targetIdx = allMessages.findIndex((m) => String(m.id) === String(messageId));
    if (targetIdx === -1) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy tin nhắn cần tách nhánh." } });
    }

    const messagesToCopy = allMessages.slice(0, targetIdx + 1);
    const forkedTitle = originalConv.title.startsWith("Nhánh: ")
      ? originalConv.title
      : `Nhánh: ${originalConv.title}`;

    let newConv;
    await sequelize.transaction(async (transaction) => {
      newConv = await Conversation.create(
        {
          userId: req.user.id,
          title: forkedTitle.slice(0, 120),
          provider: originalConv.provider,
          model: originalConv.model,
          systemPrompt: originalConv.systemPrompt,
          folderId: originalConv.folderId,
          personaId: originalConv.personaId,
        },
        { transaction }
      );

      for (const msg of messagesToCopy) {
        await Message.create(
          {
            conversationId: newConv.id,
            role: msg.role,
            content: msg.content,
            images: msg.images,
            imageBase64: msg.imageBase64,
            imageMimeType: msg.imageMimeType,
            sources: msg.sources,
            feedback: msg.feedback,
            isError: msg.isError,
          },
          { transaction }
        );
      }
    });

    res.status(201).json({
      success: true,
      data: {
        conversation: newConv,
        messageCount: messagesToCopy.length,
      },
    });
  } catch (err) {
    next(err);
  }
}));

router.delete("/:id", serializeConversationMutation(async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    await sequelize.transaction(async (transaction) => {
      await Message.destroy({ where: { conversationId: conversation.id }, transaction });
      await conversation.destroy({ transaction });
    });
    res.json({ success: true, data: { message: "Đã xóa cuộc trò chuyện." } });
  } catch (err) {
    next(err);
  }
}));

router.get("/:id/share", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    res.json({ success: true, data: { shareId: conversation.shareId || null } });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/share", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    if (!conversation.shareId) {
      conversation.shareId = crypto.randomBytes(16).toString("base64url"); // 22 ký tự, <= 50
      await conversation.save();
    }
    res.json({ success: true, data: { shareId: conversation.shareId } });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/share", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    conversation.shareId = null;
    await conversation.save();
    res.json({ success: true, data: { message: "Đã tắt chia sẻ liên kết." } });
  } catch (err) {
    next(err);
  }
});

export default router;