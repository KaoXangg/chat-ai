import crypto from "node:crypto";
import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { isValidLanguage, isValidAiLanguage, AI_LANGUAGE_AUTO } from "../utils/languages.js";

const router = express.Router();
router.use(authMiddleware);

const MAX_MEMORIES = 30;
const MAX_MEMORY_LENGTH = 300;

function normalizeMemories(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toPreferences(user) {
  return {
    uiLanguage: user.uiLanguage || null,
    aiLanguage: user.aiLanguage || AI_LANGUAGE_AUTO,
    systemPrompt: user.systemPrompt || "",
    memories: normalizeMemories(user.memories),
  };
}

router.get("/", (req, res) => {
  res.json({ success: true, data: toPreferences(req.user) });
});

/** Cập nhật ngôn ngữ giao diện, ngôn ngữ AI trả lời, chỉ dẫn hệ thống (systemPrompt) và bộ nhớ (memories). */
router.patch("/", async (req, res, next) => {
  try {
    const { uiLanguage, aiLanguage, systemPrompt, memories } = req.body;

    if (uiLanguage !== undefined && !isValidLanguage(uiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ giao diện không hợp lệ." } });
    }
    if (aiLanguage !== undefined && !isValidAiLanguage(aiLanguage)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_LANGUAGE", message: "Ngôn ngữ trả lời không hợp lệ." } });
    }
    if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
      return res.status(400).json({ success: false, error: { code: "INVALID_PROMPT", message: "Chỉ dẫn hệ thống không hợp lệ." } });
    }
    if (memories !== undefined && !Array.isArray(memories)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_MEMORIES", message: "Danh sách bộ nhớ không hợp lệ." } });
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
    if (memories !== undefined) {
      full.memories = memories
        .filter((m) => m && typeof m.content === "string" && m.content.trim())
        .slice(0, MAX_MEMORIES)
        .map((m) => ({
          id: String(m.id || crypto.randomUUID()),
          content: m.content.trim().slice(0, MAX_MEMORY_LENGTH),
          createdAt: m.createdAt || new Date().toISOString(),
        }));
    }
    await full.save();

    res.json({ success: true, data: toPreferences(full) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/preferences/memories -> Thêm một ghi nhớ cá nhân hóa mới cho AI */
router.post("/memories", async (req, res, next) => {
  try {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ success: false, error: { code: "EMPTY_MEMORY", message: "Nội dung ghi nhớ không được để trống." } });
    }
    if (content.length > MAX_MEMORY_LENGTH) {
      return res.status(400).json({
        success: false,
        error: { code: "MEMORY_TOO_LONG", message: `Mỗi ghi nhớ tối đa ${MAX_MEMORY_LENGTH} ký tự.` },
      });
    }

    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }

    const current = normalizeMemories(full.memories);
    if (current.length >= MAX_MEMORIES) {
      return res.status(400).json({
        success: false,
        error: { code: "MEMORY_LIMIT_REACHED", message: `Chỉ có thể lưu tối đa ${MAX_MEMORIES} mục ghi nhớ.` },
      });
    }

    const newItem = {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date().toISOString(),
    };
    full.memories = [newItem, ...current];
    await full.save();

    res.status(201).json({
      success: true,
      data: { memory: newItem, memories: normalizeMemories(full.memories) },
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/preferences/memories/:memoryId -> Xóa 1 mục ghi nhớ */
router.delete("/memories/:memoryId", async (req, res, next) => {
  try {
    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }

    const current = normalizeMemories(full.memories);
    full.memories = current.filter((m) => String(m.id) !== String(req.params.memoryId));
    await full.save();

    res.json({
      success: true,
      data: { memories: normalizeMemories(full.memories) },
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/preferences/memories -> Xóa toàn bộ bộ nhớ cá nhân */
router.delete("/memories", async (req, res, next) => {
  try {
    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }

    full.memories = [];
    await full.save();

    res.json({
      success: true,
      data: { memories: [] },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
