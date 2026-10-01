import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import AIModel from "../models/AIModel.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getConfiguredProviders } from "../providers/aiRouter.js";

const router = express.Router();
router.use(authMiddleware, requireAdmin);

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
router.get("/users", async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 20, role, status } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [{ username: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    }
    if (role && ["user", "admin"].includes(role)) where.role = role;
    if (status && ["active", "banned"].includes(status)) where.status = status;

    const offset = (Number(page) - 1) * Number(limit);
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["passwordHash"] },
      order: [["createdAt", "DESC"]],
      offset,
      limit: Number(limit),
    });

    res.json({ success: true, data: { users, total, page: Number(page), limit: Number(limit) } });
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

    res.json({ success: true, data: { user, usage: { conversationCount, messageCount } } });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    if (String(user.id) === String(req.user.id) && (status === "banned" || role === "user")) {
      return res.status(400).json({ success: false, error: { code: "CANNOT_MODIFY_SELF", message: "Bạn không thể tự khóa hoặc tự hạ quyền của mình." } });
    }

    if (status && ["active", "banned"].includes(status)) user.status = status;
    if (role && ["user", "admin"].includes(role)) user.role = role;

    await user.save();
    const publicData = user.toJSON();
    delete publicData.passwordHash;
    res.json({ success: true, data: { user: publicData } });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: { code: "CANNOT_DELETE_SELF", message: "Bạn không thể tự xóa tài khoản của mình." } });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng." } });

    const conversationIds = (await Conversation.findAll({ where: { userId: user.id }, attributes: ["id"] })).map((c) => c.id);
    if (conversationIds.length) {
      await Message.destroy({ where: { conversationId: { [Op.in]: conversationIds } } });
    }
    await Conversation.destroy({ where: { userId: user.id } });
    await user.destroy();

    res.json({ success: true, data: { message: "Đã xóa người dùng và toàn bộ dữ liệu liên quan." } });
  } catch (err) {
    next(err);
  }
});

// ---------- AI MODEL MANAGEMENT ----------
/** Bản sao body và chuẩn hóa hạn mức token (số nguyên >= 0; 0 = không giới hạn). */
function sanitizeModelPayload(body) {
  const payload = { ...body };
  if (payload.dailyTokenLimit !== undefined) {
    payload.dailyTokenLimit = Math.max(0, Math.floor(Number(payload.dailyTokenLimit)) || 0);
  }
  return payload;
}

router.get("/models", async (req, res, next) => {
  try {
    const models = await AIModel.findAll({ order: [["provider", "ASC"], ["priority", "ASC"]] });
    res.json({ success: true, data: { models, configuredProviders: getConfiguredProviders() } });
  } catch (err) {
    next(err);
  }
});

router.post("/models", async (req, res, next) => {
  try {
    const payload = sanitizeModelPayload(req.body);
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
});

router.patch("/models/:id", async (req, res, next) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy mô hình." } });
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
});

router.delete("/models/:id", async (req, res, next) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy mô hình." } });
    await model.destroy();
    res.json({ success: true, data: { message: "Đã xóa mô hình." } });
  } catch (err) {
    next(err);
  }
});

// ---------- CONVERSATIONS (xem/xoa vi pham) ----------
router.get("/conversations", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const { rows: conversations, count: total } = await Conversation.findAndCountAll({
      include: [{ model: User, as: "user", attributes: ["username", "email"] }],
      order: [["updatedAt", "DESC"]],
      offset,
      limit: Number(limit),
    });
    res.json({ success: true, data: { conversations, total } });
  } catch (err) {
    next(err);
  }
});

router.delete("/conversations/:id", async (req, res, next) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy cuộc trò chuyện." } });
    await Message.destroy({ where: { conversationId: conversation.id } });
    await conversation.destroy();
    res.json({ success: true, data: { message: "Đã xóa cuộc trò chuyện." } });
  } catch (err) {
    next(err);
  }
});

export default router;
