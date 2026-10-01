import express from "express";
import { Op } from "sequelize";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// GET /api/conversations?search=... -> danh sách cuộc trò chuyện của người dùng, ưu tiên mục đã ghim.
router.get("/", async (req, res, next) => {
  try {
    const { search } = req.query;
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
    const messages = await Message.findAll({ where: { conversationId: conversation.id }, order: [["createdAt", "ASC"]] });
    res.json({ success: true, data: { conversation, messages } });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { title, pinned, provider, model } = req.body;
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
});

router.delete("/:id", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    }
    await Message.destroy({ where: { conversationId: conversation.id } });
    await conversation.destroy();
    res.json({ success: true, data: { message: "Đã xóa cuộc trò chuyện." } });
  } catch (err) {
    next(err);
  }
});

export default router;
