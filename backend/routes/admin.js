import os from "os";
import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import AIModel from "../models/AIModel.js";
import Persona from "../models/Persona.js";
import TokenUsage from "../models/TokenUsage.js";
import Announcement from "../models/Announcement.js";
import SystemSetting, { getSystemSettings, invalidateSettingsCache } from "../models/SystemSetting.js";
import AuditLog, { createAuditLog } from "../models/AuditLog.js";
import Session from "../models/Session.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getConfiguredProviders } from "../providers/aiRouter.js";
import { parsePagination } from "../utils/pagination.js";
import { serializeConversationMutation, serializeDatabaseMutation, userChatLock } from "../utils/chatLock.js";
import { sanitizeModelPayload } from "../utils/modelPayload.js";
import { escapeLike, invalidInput, validateIdParam } from "../utils/validation.js";
import { validate } from "../middleware/validate.js";
import {
  listUsersQuerySchema,
  updateUserSchema,
  updateUserQuotaSchema,
  listSessionsQuerySchema,
  createModelSchema,
  updateModelSchema,
  updateSettingsSchema,
  createPersonaSchema,
  updatePersonaSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "../validators/admin.schema.js";

const router = express.Router();
router.use(authMiddleware, requireAdmin);
router.param("id", validateIdParam);
const serializeModelMutation = handler => serializeDatabaseMutation(() => ["chat:model-catalog"], handler);
const serializeUserMutation = handler => serializeDatabaseMutation(req => [userChatLock(req.params.id)], handler);

// ---------- OVERVIEW / STATS ----------
router.get("/stats", async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, bannedUsers, totalConversations, totalMessages] = await Promise.all([
      User.count(),
      User.count({ where: { status: "active" } }),
      User.count({ where: { status: "banned" } }),
      Conversation.count(),
      Message.count(),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const messagesPerDayRaw = await sequelize.query(
      `SELECT CONVERT(varchar(10), createdAt, 120) AS [date], COUNT(*) AS count
       FROM Messages
       WHERE createdAt >= :sevenDaysAgo
       GROUP BY CONVERT(varchar(10), createdAt, 120)
       ORDER BY [date] ASC`,
      { replacements: { sevenDaysAgo }, type: sequelize.QueryTypes.SELECT }
    );
    const messagesPerDay = messagesPerDayRaw.map((r) => ({ _id: r.date, count: Number(r.count) }));

    const modelUsageRaw = await sequelize.query(
      `SELECT provider AS [_id], COUNT(*) AS count
       FROM Messages
       WHERE role = 'assistant' AND provider IS NOT NULL
       GROUP BY provider
       ORDER BY COUNT(*) DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const modelUsage = modelUsageRaw.map((r) => ({ _id: r._id, count: Number(r.count) }));

    res.json({
      success: true,
      data: {
        totals: { totalUsers, activeUsers, bannedUsers, totalConversations, totalMessages },
        messagesPerDay,
        modelUsage,
        configuredProviders: getConfiguredProviders(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- USER MANAGEMENT ----------
router.get("/users", validate(listUsersQuerySchema), async (req, res, next) => {
  try {
    const { search = "", role, status } = req.query;
    if (typeof search !== "string" || search.length > 255) throw invalidInput("Từ khóa tìm kiếm không hợp lệ.");
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (search) {
      where[Op.or] = [{ username: { [Op.like]: `%${escapeLike(search)}%` } }, { email: { [Op.like]: `%${escapeLike(search)}%` } }];
    }
    if (role && ["user", "admin"].includes(role)) where.role = role;
    if (status && ["active", "banned"].includes(status)) where.status = status;

    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["passwordHash"] },
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    res.json({ success: true, data: { users, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ["passwordHash"] } });
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    const conversationCount = await Conversation.count({ where: { userId: user.id } });
    const conversationIds = (await Conversation.findAll({ where: { userId: user.id }, attributes: ["id"] })).map((c) => c.id);
    const messageCount = conversationIds.length
      ? await Message.count({ where: { conversationId: { [Op.in]: conversationIds } } })
      : 0;

    const activeSessions = await Session.findAll({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      attributes: ["id", "deviceType", "os", "browser", "ipAddress", "lastActiveAt", "createdAt"],
      order: [["lastActiveAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        user,
        usage: { conversationCount, messageCount },
        sessions: activeSessions,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/revoke-sessions", serializeUserMutation(async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    await Session.update({ isRevoked: true }, { where: { userId: user.id } });
    user.tokenVersion += 1;
    await user.save();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "USER_REVOKE_SESSIONS",
      targetType: "User",
      targetId: String(user.id),
      details: { username: user.username, email: user.email },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Đã thu hồi tất cả phiên đăng nhập của người dùng." });
  } catch (err) {
    next(err);
  }
}));

// ---------- ACTIVE SESSIONS & DEVICE MONITORING ----------
router.get("/sessions", validate(listSessionsQuerySchema), async (req, res, next) => {
  try {
    const { search, deviceType, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const sessionWhere = {
      isRevoked: false,
      expiresAt: { [Op.gt]: new Date() },
    };

    if (deviceType && ["desktop", "mobile", "tablet"].includes(deviceType)) {
      sessionWhere.deviceType = deviceType;
    }

    const userWhere = {};
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      userWhere[Op.or] = [
        sequelize.where(sequelize.fn("LOWER", sequelize.col("user.username")), "LIKE", q),
        sequelize.where(sequelize.fn("LOWER", sequelize.col("user.email")), "LIKE", q),
      ];
    }

    const { count, rows } = await Session.findAndCountAll({
      where: sessionWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "avatar", "role", "status"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
          required: Boolean(Object.keys(userWhere).length),
        },
      ],
      order: [["lastActiveAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalActive, mobileCount, desktopCount, tabletCount, active24hCount] = await Promise.all([
      Session.count({ where: { isRevoked: false, expiresAt: { [Op.gt]: new Date() } } }),
      Session.count({ where: { isRevoked: false, expiresAt: { [Op.gt]: new Date() }, deviceType: "mobile" } }),
      Session.count({ where: { isRevoked: false, expiresAt: { [Op.gt]: new Date() }, deviceType: "desktop" } }),
      Session.count({ where: { isRevoked: false, expiresAt: { [Op.gt]: new Date() }, deviceType: "tablet" } }),
      Session.count({ where: { isRevoked: false, expiresAt: { [Op.gt]: new Date() }, lastActiveAt: { [Op.gte]: oneDayAgo } } }),
    ]);

    res.json({
      success: true,
      data: {
        sessions: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
        },
        stats: {
          totalActive,
          mobileCount,
          desktopCount,
          tabletCount,
          active24hCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/sessions/:id", async (req, res, next) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [{ model: User, as: "user", attributes: ["id", "username", "email"] }],
    });
    if (!session) return res.status(404).json({ success: false, message: "Không tìm thấy phiên đăng nhập." });

    session.isRevoked = true;
    await session.save();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "ADMIN_REVOKE_SESSION",
      targetType: "Session",
      targetId: String(session.id),
      details: {
        userId: session.userId,
        username: session.user?.username,
        email: session.user?.email,
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Đã thu hồi phiên đăng nhập thành công." });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", validate(updateUserSchema), serializeUserMutation(async (req, res, next) => {
  try {
    const { status, role } = req.body;
    if ((status !== undefined && !["active", "banned"].includes(status)) || (role !== undefined && !["user", "admin"].includes(role))) throw invalidInput();
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    if (String(user.id) === String(req.user.id) && (status === "banned" || role === "user")) {
      return res.status(400).json({ success: false, error: { code: "CANNOT_MODIFY_SELF", message: "Bạn không thể tự khóa hoặc tự hạ quyền của mình." } });
    }

    if (status === "banned" && user.status !== "banned") user.tokenVersion += 1;
    if (status && ["active", "banned"].includes(status)) user.status = status;
    if (role && ["user", "admin"].includes(role)) user.role = role;

    await user.save();
    const publicData = user.toJSON();
    delete publicData.passwordHash;
    res.json({ success: true, data: { user: publicData } });
  } catch (err) {
    next(err);
  }
}));

router.delete("/users/:id", serializeUserMutation(async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: { code: "CANNOT_DELETE_SELF", message: "Bạn không thể tự xóa tài khoản của mình." } });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    const conversationIds = (await Conversation.findAll({ where: { userId: user.id }, attributes: ["id"] })).map((c) => c.id);
    await sequelize.transaction(async (transaction) => {
      if (conversationIds.length) {
        await Message.destroy({ where: { conversationId: { [Op.in]: conversationIds } }, transaction });
      }
      await Conversation.destroy({ where: { userId: user.id }, transaction });
      await user.destroy({ transaction });
    });

    res.json({ success: true, data: { message: "Đã xóa người dùng và toàn bộ dữ liệu liên quan." } });
  } catch (err) {
    next(err);
  }
}));

// ---------- AI MODEL MANAGEMENT ----------
router.get("/models", async (req, res, next) => {
  try {
    const models = await AIModel.findAll({ order: [["provider", "ASC"], ["priority", "ASC"]] });
    res.json({ success: true, data: { models, configuredProviders: getConfiguredProviders() } });
  } catch (err) {
    next(err);
  }
});

router.post("/models", validate(createModelSchema), serializeModelMutation(async (req, res, next) => {
  try {
    if (!req.body.displayName && req.body.name) {
      req.body.displayName = req.body.name;
    }
    const payload = sanitizeModelPayload(req.body, { creating: true });
    // Model mặc định phải đang bật.
    if (payload.isDefault === true) payload.enabled = true;

    const model = await sequelize.transaction(async (transaction) => {
      // Chỉ cho phép đúng 1 model mặc định: bỏ cờ của các model khác.
      if (payload.isDefault === true) {
        await AIModel.update({ isDefault: false }, { where: { isDefault: true }, transaction });
      }
      return AIModel.create(payload, { transaction });
    });
    res.status(201).json({ success: true, data: { model } });
  } catch (err) {
    next(err);
  }
}));

router.patch("/models/:id", validate(updateModelSchema), serializeModelMutation(async (req, res, next) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy mô hình." } });
    if (!req.body.displayName && req.body.name) {
      req.body.displayName = req.body.name;
    }
    const payload = sanitizeModelPayload(req.body);
    if (payload.isDefault === true) payload.enabled = true; // model mặc định phải đang bật
    if (payload.enabled === false) payload.isDefault = false; // model bị tắt không thể là mặc định

    await sequelize.transaction(async (transaction) => {
      if (payload.isDefault === true) {
        await AIModel.update(
          { isDefault: false },
          { where: { isDefault: true, id: { [Op.ne]: model.id } }, transaction }
        );
      }
      await model.update(payload, { transaction });
    });
    res.json({ success: true, data: { model } });
  } catch (err) {
    next(err);
  }
}));

router.delete("/models/:id", serializeModelMutation(async (req, res, next) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy mô hình." } });
    await model.destroy();
    res.json({ success: true, data: { message: "Đã xóa mô hình." } });
  } catch (err) {
    next(err);
  }
}));

// ---------- CONVERSATIONS (xem/xoa vi pham) ----------
router.get("/conversations", async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows: conversations, count: total } = await Conversation.findAndCountAll({
      include: [{ model: User, as: "user", attributes: ["username", "email"] }],
      order: [["updatedAt", "DESC"]],
      offset,
      limit,
    });
    res.json({ success: true, data: { conversations, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

router.delete("/conversations/:id", serializeConversationMutation(async (req, res, next) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    await sequelize.transaction(async (transaction) => {
      await Message.destroy({ where: { conversationId: conversation.id }, transaction });
      await conversation.destroy({ transaction });
    });
    res.json({ success: true, data: { message: "Đã xóa cuộc trò chuyện." } });
  } catch (err) {
    next(err);
  }
}));

// Helper che mờ API key
function maskApiKey(key) {
  if (!key || typeof key !== "string") return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  return trimmed.slice(0, 3) + "••••••••" + trimmed.slice(-4);
}

// ---------- 1. CÀI ĐẶT HỆ THỐNG & API KEYS ----------
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await getSystemSettings();
    res.json({
      success: true,
      data: {
        settings: {
          allowRegistration: settings.allowRegistration ?? true,
          maintenanceMode: settings.maintenanceMode ?? false,
          maintenanceMessage: settings.maintenanceMessage || "Hệ thống đang bảo trì.",
          globalSystemPrompt: settings.globalSystemPrompt || "",
          defaultUserDailyTokens: settings.defaultUserDailyTokens || 50000,
          rateLimitPerMinute: settings.rateLimitPerMinute || 30,
          blockedKeywords: settings.blockedKeywords || "",
          // Trả về cờ cấu hình và key đã che mờ
          hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
          maskedGeminiKey: maskApiKey(settings.geminiApiKey || process.env.GEMINI_API_KEY),
          hasGroqKey: Boolean(settings.groqApiKey || process.env.GROQ_API_KEY),
          maskedGroqKey: maskApiKey(settings.groqApiKey || process.env.GROQ_API_KEY),
          hasOpenrouterKey: Boolean(settings.openrouterApiKey || process.env.OPENROUTER_API_KEY),
          maskedOpenrouterKey: maskApiKey(settings.openrouterApiKey || process.env.OPENROUTER_API_KEY),
          hasTavilyKey: Boolean(settings.tavilyApiKey || process.env.TAVILY_API_KEY),
          maskedTavilyKey: maskApiKey(settings.tavilyApiKey || process.env.TAVILY_API_KEY),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/settings", validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const {
      allowRegistration,
      maintenanceMode,
      maintenanceMessage,
      globalSystemPrompt,
      defaultUserDailyTokens,
      rateLimitPerMinute,
      geminiApiKey,
      groqApiKey,
      openrouterApiKey,
      tavilyApiKey,
      blockedKeywords,
    } = req.body;

    let row = await SystemSetting.findByPk(1);
    if (!row) {
      row = await SystemSetting.create({ id: 1 });
    }

    if (allowRegistration !== undefined) row.allowRegistration = Boolean(allowRegistration);
    if (maintenanceMode !== undefined) row.maintenanceMode = Boolean(maintenanceMode);
    if (maintenanceMessage !== undefined) row.maintenanceMessage = String(maintenanceMessage).slice(0, 500);
    if (globalSystemPrompt !== undefined) row.globalSystemPrompt = String(globalSystemPrompt);
    if (defaultUserDailyTokens !== undefined && Number(defaultUserDailyTokens) >= 0) {
      row.defaultUserDailyTokens = Math.min(Number(defaultUserDailyTokens), 10_000_000);
    }
    if (rateLimitPerMinute !== undefined && Number(rateLimitPerMinute) >= 1) {
      row.rateLimitPerMinute = Math.min(Number(rateLimitPerMinute), 1000);
    }
    if (blockedKeywords !== undefined) {
      row.blockedKeywords = String(blockedKeywords).trim();
    }

    // Cập nhật API Keys nếu có truyền chuỗi không rỗng
    if (typeof geminiApiKey === "string" && geminiApiKey.trim()) row.geminiApiKey = geminiApiKey.trim();
    if (typeof groqApiKey === "string" && groqApiKey.trim()) row.groqApiKey = groqApiKey.trim();
    if (typeof openrouterApiKey === "string" && openrouterApiKey.trim()) row.openrouterApiKey = openrouterApiKey.trim();
    if (typeof tavilyApiKey === "string" && tavilyApiKey.trim()) row.tavilyApiKey = tavilyApiKey.trim();

    await row.save();
    invalidateSettingsCache();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "SETTINGS_UPDATE",
      targetType: "SystemSetting",
      targetId: "1",
      details: {
        allowRegistration: row.allowRegistration,
        maintenanceMode: row.maintenanceMode,
        defaultUserDailyTokens: row.defaultUserDailyTokens,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: "Đã cập nhật cài đặt hệ thống thành công." } });
  } catch (err) {
    next(err);
  }
});

// ---------- 2. KIỂM TRA SỨC KHỎE AI (LIVE PING & LATENCY) ----------
async function pingProvider(provider, customKey = null) {
  const start = Date.now();
  const settings = await getSystemSettings();
  try {
    if (provider === "gemini") {
      const key = customKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!key) return { provider, status: "unconfigured", latencyMs: null, message: "Chưa cấu hình API Key" };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`, { signal: AbortSignal.timeout(8000) });
      const latency = Date.now() - start;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { provider, status: "error", latencyMs: latency, error: `Google API lỗi ${res.status}: ${text.slice(0, 150)}` };
      }
      return { provider, status: "ok", latencyMs: latency, message: "Kết nối Google Gemini thành công" };
    }

    if (provider === "groq") {
      const key = customKey || settings.groqApiKey || process.env.GROQ_API_KEY;
      if (!key) return { provider, status: "unconfigured", latencyMs: null, message: "Chưa cấu hình API Key" };
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { provider, status: "error", latencyMs: latency, error: `Groq API lỗi ${res.status}: ${text.slice(0, 150)}` };
      }
      return { provider, status: "ok", latencyMs: latency, message: "Kết nối Groq siêu tốc thành công" };
    }

    if (provider === "openrouter") {
      const key = customKey || settings.openrouterApiKey || process.env.OPENROUTER_API_KEY;
      if (!key) return { provider, status: "unconfigured", latencyMs: null, message: "Chưa cấu hình API Key" };
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { provider, status: "error", latencyMs: latency, error: `OpenRouter lỗi ${res.status}: ${text.slice(0, 150)}` };
      }
      return { provider, status: "ok", latencyMs: latency, message: "Kết nối OpenRouter thành công" };
    }

    if (provider === "tavily") {
      const key = customKey || settings.tavilyApiKey || process.env.TAVILY_API_KEY;
      if (!key) return { provider, status: "unconfigured", latencyMs: null, message: "Chưa cấu hình API Key" };
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query: "ping", max_results: 1 }),
        signal: AbortSignal.timeout(8000),
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { provider, status: "error", latencyMs: latency, error: `Tavily Search lỗi ${res.status}: ${text.slice(0, 150)}` };
      }
      return { provider, status: "ok", latencyMs: latency, message: "Kết nối Tavily Web Search thành công" };
    }

    return { provider, status: "unknown", latencyMs: null, message: "Nhà cung cấp không xác định" };
  } catch (err) {
    const latency = Date.now() - start;
    return { provider, status: "error", latencyMs: latency, error: err.message || "Timeout kết nối" };
  }
}

router.post("/health-check", async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body;
    if (provider) {
      const result = await pingProvider(provider, apiKey);
      return res.json({ success: true, data: { result } });
    }

    // Ping toàn bộ các provider
    const results = await Promise.all([
      pingProvider("gemini"),
      pingProvider("groq"),
      pingProvider("openrouter"),
      pingProvider("tavily"),
    ]);

    res.json({ success: true, data: { results } });
  } catch (err) {
    next(err);
  }
});

// ---------- 3. QUẢN LÝ QUOTA & RATE LIMIT USER ----------
router.patch("/users/:id/quota", validate(updateUserQuotaSchema), serializeUserMutation(async (req, res, next) => {
  try {
    const { customDailyTokenLimit, userTier } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    if (customDailyTokenLimit !== undefined) {
      user.customDailyTokenLimit = customDailyTokenLimit === null || customDailyTokenLimit === ""
        ? null
        : Math.max(0, parseInt(customDailyTokenLimit, 10));
    }
    if (userTier !== undefined && ["free", "plus", "premium", "pro", "vip"].includes(userTier)) {
      user.userTier = userTier;
    }

    await user.save();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "USER_QUOTA_UPDATE",
      targetType: "User",
      targetId: String(user.id),
      details: {
        customDailyTokenLimit: user.customDailyTokenLimit,
        userTier: user.userTier,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}));

router.post("/users/:id/reset-quota", serializeUserMutation(async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const deleted = await TokenUsage.destroy({
      where: {
        userId: user.id,
        createdAt: { [Op.gte]: startOfToday },
      },
    });

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "USER_RESET_QUOTA",
      targetType: "User",
      targetId: String(user.id),
      details: { deletedUsageRecords: deleted },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: `Đã reset hạn mức hôm nay cho ${user.username}.` } });
  } catch (err) {
    next(err);
  }
}));

// ---------- 4. QUẢN LÝ TRỢ LÝ AI HỆ THỐNG CHÍNH THỨC (OFFICIAL SYSTEM PERSONAS) ----------
// Lưu ý bảo mật: Trợ lý cá nhân của người dùng là riêng tư tuyệt đối, Admin chỉ quản lý các trợ lý công khai của hệ thống.
router.get("/personas", async (req, res, next) => {
  try {
    const systemPersonas = await Persona.findAll({
      where: { userId: null },
      order: [["createdAt", "ASC"]],
    });

    res.json({ success: true, data: { personas: systemPersonas } });
  } catch (err) {
    next(err);
  }
});

router.post("/personas", validate(createPersonaSchema), async (req, res, next) => {
  try {
    const { name, role, description, systemPrompt, avatar, category, suggestedPrompts } = req.body;
    if (!name || !role || !systemPrompt) {
      return res.status(400).json({ success: false, message: "Tên, vai trò và system prompt là bắt buộc." });
    }

    const persona = await Persona.create({
      userId: null, // Persona hệ thống
      name: name.trim(),
      role: role.trim(),
      description: description?.trim() || null,
      systemPrompt: systemPrompt.trim(),
      avatar: avatar || "🤖",
      category: category || "general",
      suggestedPrompts: typeof suggestedPrompts === "object" ? JSON.stringify(suggestedPrompts) : suggestedPrompts,
    });

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "PERSONA_CREATE",
      targetType: "Persona",
      targetId: String(persona.id),
      details: { name: persona.name, role: persona.role },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: { persona } });
  } catch (err) {
    next(err);
  }
});

router.patch("/personas/:id", validate(updatePersonaSchema), async (req, res, next) => {
  try {
    const persona = await Persona.findOne({ where: { id: req.params.id, userId: null } });
    if (!persona) return res.status(404).json({ success: false, message: "Không tìm thấy trợ lý hệ thống." });

    const { name, role, description, systemPrompt, avatar, category, suggestedPrompts } = req.body;
    if (name) persona.name = name.trim();
    if (role) persona.role = role.trim();
    if (description !== undefined) persona.description = description ? description.trim() : null;
    if (systemPrompt) persona.systemPrompt = systemPrompt.trim();
    if (avatar) persona.avatar = avatar;
    if (category) persona.category = category;
    if (suggestedPrompts !== undefined) {
      persona.suggestedPrompts = typeof suggestedPrompts === "object" ? JSON.stringify(suggestedPrompts) : suggestedPrompts;
    }

    await persona.save();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "PERSONA_UPDATE",
      targetType: "Persona",
      targetId: String(persona.id),
      details: { name: persona.name },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { persona } });
  } catch (err) {
    next(err);
  }
});

router.delete("/personas/:id", async (req, res, next) => {
  try {
    const persona = await Persona.findOne({ where: { id: req.params.id, userId: null } });
    if (!persona) return res.status(404).json({ success: false, message: "Không tìm thấy trợ lý hệ thống." });

    const name = persona.name;
    await persona.destroy();

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "PERSONA_DELETE",
      targetType: "Persona",
      targetId: String(req.params.id),
      details: { name },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: `Đã xóa trợ lý "${name}".` } });
  } catch (err) {
    next(err);
  }
});

// ---------- 5. NHẬT KÝ HOẠT ĐỘNG (AUDIT LOGS) ----------
router.get("/audit-logs", async (req, res, next) => {
  try {
    const { action, search = "" } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (action) where.action = action;
    if (search) {
      where[Op.or] = [
        { adminUsername: { [Op.like]: `%${escapeLike(search)}%` } },
        { action: { [Op.like]: `%${escapeLike(search)}%` } },
        { details: { [Op.like]: `%${escapeLike(search)}%` } },
      ];
    }

    const { rows: logs, count: total } = await AuditLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    res.json({ success: true, data: { logs, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

// ---------- 6. PHÂN TÍCH CHI PHÍ & XUẤT CSV ----------
router.get("/analytics/costs", async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = await TokenUsage.findAll({
      attributes: [
        "provider",
        "modelId",
        [sequelize.fn("SUM", sequelize.col("promptTokens")), "promptTokens"],
        [sequelize.fn("SUM", sequelize.col("completionTokens")), "completionTokens"],
        [sequelize.fn("SUM", sequelize.col("totalTokens")), "totalTokens"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requestCount"],
      ],
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      group: ["provider", "modelId"],
      raw: true,
    });

    let totalTokensAll = 0;
    let totalCostUSDAll = 0;

    const breakdown = stats.map((row) => {
      const prompt = Number(row.promptTokens) || 0;
      const completion = Number(row.completionTokens) || 0;
      const total = Number(row.totalTokens) || 0;
      const count = Number(row.requestCount) || 0;

      let promptRate = 0.15; // USD per 1M tokens
      let completionRate = 0.60;
      if (row.provider === "openrouter" && (row.modelId || "").includes("free")) {
        promptRate = 0;
        completionRate = 0;
      } else if (row.provider === "gemini") {
        promptRate = 0.075;
        completionRate = 0.30;
      } else if (row.provider === "groq") {
        promptRate = 0.59;
        completionRate = 0.79;
      }

      const cost = (prompt / 1_000_000) * promptRate + (completion / 1_000_000) * completionRate;
      totalTokensAll += total;
      totalCostUSDAll += cost;

      return {
        provider: row.provider,
        modelId: row.modelId,
        promptTokens: prompt,
        completionTokens: completion,
        totalTokens: total,
        requestCount: count,
        estimatedCostUSD: Number(cost.toFixed(5)),
      };
    });

    res.json({
      success: true,
      data: {
        totalTokens: totalTokensAll,
        totalCostUSD: Number(totalCostUSDAll.toFixed(4)),
        breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics/export-users", async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "email", "role", "status", "userTier", "customDailyTokenLimit", "createdAt"],
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // Tạo CSV header và rows (hỗ trợ tiếng Việt với UTF-8 BOM \uFEFF)
    const headers = ["ID", "Tên người dùng", "Email", "Vai trò", "Trạng thái", "Gói", "Hạn ngạch token/ngày", "Ngày tạo"];
    const rows = users.map((u) => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      u.role,
      u.status,
      u.userTier || "free",
      u.customDailyTokenLimit !== null ? u.customDailyTokenLimit : "Mặc định",
      new Date(u.createdAt).toISOString(),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// ---------- 5. QUẢN LÝ THÔNG BÁO TOÀN HỆ THỐNG (ANNOUNCEMENTS) ----------
router.get("/announcements", async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: { announcements } });
  } catch (err) {
    next(err);
  }
});

router.post("/announcements", validate(createAnnouncementSchema), async (req, res, next) => {
  try {
    const { title, content, type = "info", active = true, dismissible = true, startsAt, expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Tiêu đề và nội dung thông báo là bắt buộc." });
    }

    const item = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      type: ["info", "warning", "success", "promo"].includes(type) ? type : "info",
      active: Boolean(active),
      dismissible: dismissible !== false,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "ANNOUNCEMENT_CREATE",
      targetType: "Announcement",
      targetId: String(item.id),
      details: { title: item.title, type: item.type },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: { announcement: item } });
  } catch (err) {
    next(err);
  }
});

router.patch("/announcements/:id", validate(updateAnnouncementSchema), async (req, res, next) => {
  try {
    const item = await Announcement.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy thông báo." });

    const { title, content, type, active, dismissible, startsAt, expiresAt } = req.body;
    if (title !== undefined) item.title = title.trim();
    if (content !== undefined) item.content = content.trim();
    if (type !== undefined && ["info", "warning", "success", "promo"].includes(type)) item.type = type;
    if (active !== undefined) item.active = Boolean(active);
    if (dismissible !== undefined) item.dismissible = Boolean(dismissible);
    if (startsAt !== undefined) item.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) item.expiresAt = expiresAt ? new Date(expiresAt) : null;

    await item.save();

    res.json({ success: true, data: { announcement: item } });
  } catch (err) {
    next(err);
  }
});

router.delete("/announcements/:id", async (req, res, next) => {
  try {
    const item = await Announcement.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy thông báo." });
    await item.destroy();
    res.json({ success: true, data: { message: "Đã xóa thông báo." } });
  } catch (err) {
    next(err);
  }
});

// ---------- 6. PHÂN TÍCH THEO NHÀ CUNG CẤP & TOP POWER USERS ----------
router.get("/analytics/providers", async (req, res, next) => {
  try {
    // 1. Tổng hợp theo nhà cung cấp (Gemini vs Groq vs OpenRouter) từ TokenUsage
    const providerStats = await TokenUsage.findAll({
      attributes: [
        "provider",
        [sequelize.fn("SUM", sequelize.col("totalTokens")), "totalTokens"],
        [sequelize.fn("SUM", sequelize.col("promptTokens")), "promptTokens"],
        [sequelize.fn("SUM", sequelize.col("completionTokens")), "completionTokens"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requestCount"],
      ],
      group: ["provider"],
      raw: true,
    });

    // 2. Top 10 người dùng tiêu hao token nhiều nhất
    const topUsersRaw = await TokenUsage.findAll({
      attributes: [
        "userId",
        [sequelize.fn("SUM", sequelize.col("totalTokens")), "totalTokens"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requestCount"],
      ],
      group: ["userId"],
      order: [[sequelize.literal("totalTokens"), "DESC"]],
      limit: 10,
      raw: true,
    });

    // Lấy thông tin user tương ứng
    const userIds = topUsersRaw.map((u) => u.userId);
    const usersInfo = await User.findAll({
      where: { id: userIds },
      attributes: ["id", "username", "email", "userTier", "role"],
      raw: true,
    });
    const userMap = new Map(usersInfo.map((u) => [u.id, u]));

    const topUsers = topUsersRaw.map((u) => {
      const info = userMap.get(u.userId) || {};
      return {
        userId: u.userId,
        username: info.username || `User #${u.userId}`,
        email: info.email || "",
        userTier: info.userTier || "free",
        role: info.role || "user",
        totalTokens: Number(u.totalTokens) || 0,
        requestCount: Number(u.requestCount) || 0,
      };
    });

    res.json({
      success: true,
      data: {
        providerStats: providerStats.map((p) => ({
          provider: p.provider || "Khác",
          totalTokens: Number(p.totalTokens) || 0,
          promptTokens: Number(p.promptTokens) || 0,
          completionTokens: Number(p.completionTokens) || 0,
          requestCount: Number(p.requestCount) || 0,
        })),
        topUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- 7. GIÁM SÁT TÀI NGUYÊN SERVER & SAO LƯU DỰ PHÒNG ----------
router.get("/system/status", async (req, res, next) => {
  try {
    const memory = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const uptimeSec = Math.floor(process.uptime());

    const [userCount, conversationCount, messageCount, modelCount, announcementCount] = await Promise.all([
      User.count(),
      Conversation.count(),
      Message.count(),
      AIModel.count(),
      Announcement.count(),
    ]);

    res.json({
      success: true,
      data: {
        server: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptimeSec,
          formattedUptime: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
        },
        memory: {
          heapUsedMB: Number((memory.heapUsed / 1024 / 1024).toFixed(1)),
          heapTotalMB: Number((memory.heapTotal / 1024 / 1024).toFixed(1)),
          rssMB: Number((memory.rss / 1024 / 1024).toFixed(1)),
          systemTotalMemMB: Number((totalMem / 1024 / 1024).toFixed(0)),
          systemFreeMemMB: Number((freeMem / 1024 / 1024).toFixed(0)),
          systemUsedPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
        },
        database: {
          status: "connected",
          totalUsers: userCount,
          totalConversations: conversationCount,
          totalMessages: messageCount,
          totalModels: modelCount,
          totalAnnouncements: announcementCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/system/export", async (req, res, next) => {
  try {
    const [settings, models, personas, announcements] = await Promise.all([
      SystemSetting.findByPk(1),
      AIModel.findAll({ order: [["priority", "ASC"]] }),
      Persona.findAll({ where: { userId: null }, order: [["createdAt", "ASC"]] }),
      Announcement.findAll({ order: [["createdAt", "DESC"]] }),
    ]);

    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      settings: settings ? {
        allowRegistration: settings.allowRegistration,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        globalSystemPrompt: settings.globalSystemPrompt,
        defaultUserDailyTokens: settings.defaultUserDailyTokens,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        blockedKeywords: settings.blockedKeywords,
      } : null,
      models: models.map((m) => ({
        name: m.name,
        provider: m.provider,
        modelId: m.modelId,
        description: m.description,
        enabled: m.enabled,
        isDefault: m.isDefault,
        priority: m.priority,
        contextLength: m.contextLength,
        inputCostPer1k: m.inputCostPer1k,
        outputCostPer1k: m.outputCostPer1k,
        dailyTokenLimit: m.dailyTokenLimit,
      })),
      personas: personas.map((p) => ({
        name: p.name,
        role: p.role,
        category: p.category,
        avatar: p.avatar,
        description: p.description,
        systemPrompt: p.systemPrompt,
        suggestedPrompts: p.suggestedPrompts,
      })),
      announcements: announcements.map((a) => ({
        title: a.title,
        content: a.content,
        type: a.type,
        active: a.active,
        dismissible: a.dismissible,
      })),
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="system_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    next(err);
  }
});

router.post("/system/import", async (req, res, next) => {
  try {
    const { backupData } = req.body;
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ success: false, message: "Dữ liệu sao lưu không hợp lệ." });
    }

    let updatedCount = 0;

    // Phục hồi Settings
    if (backupData.settings) {
      let row = await SystemSetting.findByPk(1);
      if (!row) row = await SystemSetting.create({ id: 1 });
      Object.assign(row, backupData.settings);
      await row.save();
      invalidateSettingsCache();
      updatedCount++;
    }

    await createAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: "SYSTEM_RESTORE",
      targetType: "System",
      targetId: "1",
      details: { exportedAt: backupData.exportedAt },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: `Phục hồi cấu hình thành công! (Phiên bản: ${backupData.version || "1.0"})` } });
  } catch (err) {
    next(err);
  }
});

export default router;
