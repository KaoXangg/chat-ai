import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { isValidLanguage, isValidAiLanguage, AI_LANGUAGE_AUTO } from "../utils/languages.js";

const router = express.Router();
router.use(authMiddleware);

function toPreferences(user) {
  return {
    uiLanguage: user.uiLanguage || null,
    aiLanguage: user.aiLanguage || AI_LANGUAGE_AUTO,
    systemPrompt: user.systemPrompt || "",
  };
}

router.get("/", (req, res) => {
  res.json({ success: true, data: toPreferences(req.user) });
});

/** Cập nhật ngôn ngữ giao diện, ngôn ngữ AI trả lời và chỉ dẫn hệ thống (systemPrompt). */
router.patch("/", async (req, res, next) => {
  try {
    const { uiLanguage, aiLanguage, systemPrompt } = req.body;

    if (uiLanguage !== undefined && !isValidLanguage(uiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ giao diện không hợp lệ." } });
    }
    if (aiLanguage !== undefined && !isValidAiLanguage(aiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ trả lời không hợp lệ." } });
    }
    if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
      return res.status(400).json({ success: false, error: { code: "INVALID_PROMPT", message: "Chỉ dẫn hệ thống không hợp lệ." } });
    }

    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    if (uiLanguage !== undefined) full.uiLanguage = uiLanguage;
    if (aiLanguage !== undefined) full.aiLanguage = aiLanguage;
    if (systemPrompt !== undefined) {
      full.systemPrompt = systemPrompt ? systemPrompt.trim().slice(0, 2000) : null;
    }
    await full.save();

    res.json({ success: true, data: toPreferences(full) });
  } catch (err) {
    next(err);
  }
});

export default router;