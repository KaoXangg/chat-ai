import express from "express";
import AIModel from "../models/AIModel.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { getConfiguredProviders } from "../providers/aiRouter.js";
import {
  getQuotaWindow,
  getTzLabel,
  getUsageByModel,
  modelKey,
  getUserTodayQuota,
  normalizeTier,
  getTierMultiplier,
  TIER_LIMITS,
} from "../utils/quota.js";
import { validate } from "../middleware/validate.js";
import { upgradeTierSchema } from "../validators/usage.schema.js";
import { createAuditLog } from "../models/AuditLog.js";

const router = express.Router();
router.use(authMiddleware);

// GET /api/usage -> mức sử dụng token hôm nay của người dùng hiện tại, theo từng model đang bật và tổng quota theo gói.
router.get("/", async (req, res, next) => {
  try {
    const { startsAt, resetsAt } = getQuotaWindow();
    const [models, usageMap, quota] = await Promise.all([
      AIModel.findAll({ where: { enabled: true }, order: [["priority", "ASC"]] }),
      getUsageByModel(req.user.id, startsAt),
      getUserTodayQuota(req.user),
    ]);
    const configured = getConfiguredProviders();

    // Hệ số nhân hạn mức per-model theo gói người dùng
    const tierMultiplier = getTierMultiplier(req.user.userTier);

    const items = models.map((m) => {
      const used = usageMap.get(modelKey(m.provider, m.modelId)) || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requests: 0,
      };
      const baseLimit = Number(m.dailyTokenLimit) || 0;
      // limit = 0 nghĩa là không giới hạn; lấy baseLimit nhân hệ số gói.
      const effectiveLimit = baseLimit > 0 ? baseLimit * tierMultiplier : 0;
      const unlimited = effectiveLimit <= 0;
      return {
        _id: m._id,
        provider: m.provider,
        modelId: m.modelId,
        displayName: m.displayName,
        available: configured.includes(m.provider),
        unlimited,
        limit: effectiveLimit,
        used: used.totalTokens,
        promptTokens: used.promptTokens,
        completionTokens: used.completionTokens,
        requests: used.requests,
        remaining: unlimited ? null : Math.max(0, effectiveLimit - used.totalTokens),
        percentUsed: unlimited ? null : Math.min(100, Math.round((used.totalTokens / effectiveLimit) * 100)),
        percentRemaining: unlimited ? null : Math.max(0, 100 - Math.round((used.totalTokens / effectiveLimit) * 100)),
      };
    });

    const totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
    for (const u of usageMap.values()) {
      totals.promptTokens += u.promptTokens;
      totals.completionTokens += u.completionTokens;
      totals.totalTokens += u.totalTokens;
      totals.requests += u.requests;
    }

    const resetAtIso = quota.resetsAt instanceof Date ? quota.resetsAt.toISOString() : new Date(quota.resetsAt).toISOString();
    res.json({
      success: true,
      data: {
        window: { startsAt, resetsAt, period: "day", timezone: getTzLabel() },
        totals,
        quota: {
          ...quota,
          remaining: quota.remainingToday,
          resetAt: resetAtIso,
        },
        models: items,
        remaining: quota.remainingToday,
        resetAt: resetAtIso,
        percentUsed: quota.percentUsed,
        isExhausted: quota.isExhausted,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/usage/upgrade -> Nâng cấp gói dịch vụ (Free -> Plus -> Premium)
router.post("/upgrade", validate(upgradeTierSchema), async (req, res, next) => {
  try {
    const { tier } = req.body;
    const normalized = normalizeTier(tier);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }

    const oldTier = user.userTier || "free";
    user.userTier = normalized;
    await user.save();

    await createAuditLog({
      adminId: user.id,
      adminUsername: user.username,
      action: "TIER_UPGRADE",
      targetType: "User",
      targetId: String(user.id),
      details: { fromTier: oldTier, toTier: normalized },
      ipAddress: req.ip,
    }).catch(() => {});

    const updatedQuota = await getUserTodayQuota(user);

    res.json({
      success: true,
      message: `Đã cập nhật gói dịch vụ thành ${normalized.toUpperCase()} thành công.`,
      data: {
        tier: normalized,
        quota: updatedQuota,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
