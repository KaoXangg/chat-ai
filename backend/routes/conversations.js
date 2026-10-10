import express from "express";
import { Op, literal } from "sequelize";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/auth.js";
import { serializeConversationMutation } from "../utils/chatLock.js";
import { sequelize } from "../config/db.js";
import { invalidInput, validateIdParam } from "../utils/validation.js";

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
    if (search) where.title = { [Op.like]: `%${search}%` };

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
    const { title, pinned, provider, model } = req.body;
    validateConversationFields({ title, pinned, provider, model });
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }

    if (title !== undefined) conversation.title = title.trim().slice(0, 120) || "Cuộc trò chuyện mới";
    if (pinned !== undefined) conversation.pinned = Boolean(pinned);
    if (provider !== undefined) conversation.provider = provider;
    if (model !== undefined) conversation.model = model;

    await conversation.save();
    res.json({ success: true, data: { conversation } });
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

export default router;
