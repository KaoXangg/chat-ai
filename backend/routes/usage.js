import express from "express";
import AIModel from "../models/AIModel.js";
import User from "../models/User.js";
import UpgradeRequest from "../models/UpgradeRequest.js";
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
  getTierFeatures,
  TIER_LIMITS,
} from "../utils/quota.js";
import { validate } from "../middleware/validate.js";
import { upgradeTierSchema } from "../validators/usage.schema.js";
import { createAuditLog } from "../models/AuditLog.js";

const router = express.Router();
router.use(authMiddleware);

const PLAN_PRICING = {
  free: { monthly: 0, yearly: 0 },
  plus: { monthly: 99_000, yearly: 990_000 },
  premium: { monthly: 249_000, yearly: 2_490_000 },
};

// GET /api/usage -> mức sử dụng token hôm nay của người dùng hiện tại, theo từng model đang bật và tổng quota theo gói.
router.get("/", async (req, res, next) => {
  try {
    const { startsAt, resetsAt } = getQuotaWindow();
    const [models, usageMap, quota, pendingUpgrade] = await Promise.all([
      AIModel.findAll({ where: { enabled: true }, order: [["priority", "ASC"]] }),
      getUsageByModel(req.user.id, startsAt),
      getUserTodayQuota(req.user),
      UpgradeRequest.findOne({
        where: { userId: req.user.id, status: "pending" },
        order: [["createdAt", "DESC"]],
      }).catch(() => null),
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
        tierFeatures: getTierFeatures(req.user.userTier),
        pendingUpgradeRequest: pendingUpgrade,
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

// POST /api/usage/upgrade -> Tạo yêu cầu nâng cấp gói dịch vụ chờ Admin duyệt (hoặc hạ về Free ngay)
router.post("/upgrade", validate(upgradeTierSchema), async (req, res, next) => {
  try {
    const { tier, billingCycle = "monthly", note } = req.body;
    const normalized = normalizeTier(tier);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }

    const oldTier = normalizeTier(user.userTier || "free");
    if (oldTier === normalized) {
      return res.status(400).json({
        success: false,
        error: { code: "ALREADY_ON_TIER", message: `Bạn hiện đang ở gói ${normalized.toUpperCase()}.` },
      });
    }

    // Nếu chuyển về gói Free hoặc tài khoản là Admin -> áp dụng ngay lập tức
    if (normalized === "free" || user.role === "admin") {
      user.userTier = normalized;
      await user.save();

      await UpgradeRequest.update(
        { status: "cancelled", adminNote: "Người dùng chuyển gói trực tiếp." },
        { where: { userId: user.id, status: "pending" } }
      ).catch(() => {});

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
      return res.json({
        success: true,
        pending: false,
        message: `Đã cập nhật gói dịch vụ thành ${normalized.toUpperCase()} thành công.`,
        data: {
          tier: normalized,
          quota: updatedQuota,
        },
      });
    }

    // Người dùng thường nâng cấp lên Plus / Premium -> tạo yêu cầu chờ Admin phê duyệt
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const amount = PLAN_PRICING[normalized]?.[cycle] || 0;
    const cleanNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : null;

    let pendingReq = await UpgradeRequest.findOne({
      where: { userId: user.id, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    if (pendingReq) {
      pendingReq.requestedTier = normalized;
      pendingReq.billingCycle = cycle;
      pendingReq.amount = amount;
      pendingReq.note = cleanNote;
      await pendingReq.save();
    } else {
      pendingReq = await UpgradeRequest.create({
        userId: user.id,
        currentTier: oldTier,
        requestedTier: normalized,
        billingCycle: cycle,
        amount,
        note: cleanNote,
        status: "pending",
      });
    }

    await createAuditLog({
      adminId: user.id,
      adminUsername: user.username,
      action: "TIER_UPGRADE_REQUEST",
      targetType: "UpgradeRequest",
      targetId: String(pendingReq.id),
      details: { fromTier: oldTier, requestedTier: normalized, billingCycle: cycle, amount, note: cleanNote },
      ipAddress: req.ip,
    }).catch(() => {});

    const currentQuota = await getUserTodayQuota(user);

    res.status(202).json({
      success: true,
      pending: true,
      message: `Đã gửi yêu cầu nâng cấp lên gói ${normalized.toUpperCase()}. Yêu cầu sẽ được kích hoạt ngay sau khi Quản trị viên phê duyệt.`,
      data: {
        tier: oldTier,
        request: pendingReq,
        quota: currentQuota,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/usage/upgrade-request -> Hủy yêu cầu nâng cấp đang chờ duyệt
router.delete("/upgrade-request", async (req, res, next) => {
  try {
    const pendingReq = await UpgradeRequest.findOne({
      where: { userId: req.user.id, status: "pending" },
      order: [["createdAt", "DESC"]],
    });
    if (!pendingReq) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không có yêu cầu nâng cấp nào đang chờ duyệt." },
      });
    }
    pendingReq.status = "cancelled";
    await pendingReq.save();

    res.json({
      success: true,
      message: "Đã hủy yêu cầu nâng cấp gói.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
