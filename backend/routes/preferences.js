import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { isValidLanguage, isValidAiLanguage, AI_LANGUAGE_AUTO } from "../utils/languages.js";

const router = express.Router();
router.use(authMiddleware);

function toPreferences(user) {
  return { uiLanguage: user.uiLanguage || null, aiLanguage: user.aiLanguage || AI_LANGUAGE_AUTO };
}

router.get("/", (req, res) => {
  res.json({ success: true, data: toPreferences(req.user) });
});

/** Cập nhật ngôn ngữ giao diện và/hoặc ngôn ngữ AI trả lời. Chỉ các trường được gửi mới bị thay đổi. */
router.patch("/", async (req, res, next) => {
  try {
    const { uiLanguage, aiLanguage } = req.body;

    if (uiLanguage !== undefined && !isValidLanguage(uiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ giao diện không hợp lệ." } });
    }
    if (aiLanguage !== undefined && !isValidAiLanguage(aiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ trả lời không hợp lệ." } });
    }

    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    if (uiLanguage !== undefined) full.uiLanguage = uiLanguage;
    if (aiLanguage !== undefined) full.aiLanguage = aiLanguage;
    await full.save();

    res.json({ success: true, data: toPreferences(full) });
  } catch (err) {
    next(err);
  }
});

export default router;