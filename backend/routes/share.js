import express from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const router = express.Router();

/**
 * GET /api/share/:shareId
 * Endpoint công khai cho phép bất kỳ ai có đường link xem lại cuộc trò chuyện mà không cần đăng nhập.
 */
router.get("/:shareId", async (req, res, next) => {
  try {
    const { shareId } = req.params;
    if (!shareId || typeof shareId !== "string" || shareId.length > 50) {
      return res.status(400).json({ success: false, error: { code: "INVALID_SHARE_ID", message: "Mã liên kết không hợp lệ." } });
    }

    const conversation = await Conversation.findOne({
      where: { shareId },
      attributes: ["id", "title", "provider", "model", "createdAt", "updatedAt"],
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Cuộc trò chuyện này không tồn tại hoặc đã bị tắt chia sẻ." },
      });
    }

    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      attributes: ["id", "role", "content", "createdAt"],
      order: [["createdAt", "ASC"], ["id", "ASC"]],
    });

    res.json({
      success: true,
      data: {
        conversation: {
          title: conversation.title,
          provider: conversation.provider,
          model: conversation.model,
          createdAt: conversation.createdAt,
        },
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
