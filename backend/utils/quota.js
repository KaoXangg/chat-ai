import { Op, fn, col } from "sequelize";
import TokenUsage from "../models/TokenUsage.js";

const DAY_MS = 86_400_000;

/** Múi giờ dùng để tính "ngày" của hạn mức (mặc định GMT+7 = giờ Việt Nam). Đổi bằng QUOTA_TZ_OFFSET_HOURS trong .env. */
export function getTzOffsetHours() {
  const raw = process.env.QUOTA_TZ_OFFSET_HOURS;
  const n = raw !== undefined && raw !== "" ? Number(raw) : 7;
  return Number.isFinite(n) ? n : 7;
}

export function getTzLabel() {
  const h = getTzOffsetHours();
  return `GMT${h >= 0 ? "+" : ""}${h}`;
}

/** Cửa sổ hạn mức hiện tại: từ 00:00 hôm nay đến 00:00 hôm sau (theo múi giờ cấu hình). */
export function getQuotaWindow(now = Date.now()) {
  const offsetMs = getTzOffsetHours() * 3_600_000;
  const startsAt = Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
  return { startsAt: new Date(startsAt), resetsAt: new Date(startsAt + DAY_MS) };
}

// Khóa định danh model, cùng định dạng với aiRouter.js (`${provider}/${modelId}`).
export const modelKey = (provider, modelId) => `${provider}/${modelId}`;

/** Tổng token đã dùng của 1 user từ thời điểm `since`, gom theo model. Trả về Map<modelKey, {...}>. */
export async function getUsageByModel(userId, since) {
  const rows = await TokenUsage.findAll({
    attributes: [
      "provider",
      "modelId",
      [fn("SUM", col("promptTokens")), "sumPrompt"],
      [fn("SUM", col("completionTokens")), "sumCompletion"],
      [fn("SUM", col("totalTokens")), "sumTotal"],
      [fn("COUNT", col("id")), "requests"],
    ],
    where: { userId, createdAt: { [Op.gte]: since } },
    group: ["provider", "modelId"],
    raw: true,
  });

  const map = new Map();
  for (const r of rows) {
    map.set(modelKey(r.provider, r.modelId), {
      promptTokens: Number(r.sumPrompt) || 0,
      completionTokens: Number(r.sumCompletion) || 0,
      totalTokens: Number(r.sumTotal) || 0,
      requests: Number(r.requests) || 0,
    });
  }
  return map;
}

/** Tập các model mà user đã dùng hết hạn mức hôm nay (dailyTokenLimit > 0 và đã dùng >= giới hạn hiệu dụng). */
export async function getExhaustedModels(userId, catalog, userTier) {
  const limited = catalog.filter((m) => Number(m.dailyTokenLimit) > 0);
  if (!limited.length) return new Set();

  const multiplier = getTierMultiplier(userTier);
  const usage = await getUsageByModel(userId, getQuotaWindow().startsAt);
  const exhausted = new Set();
  for (const m of limited) {
    const effectiveLimit = Number(m.dailyTokenLimit) * multiplier;
    const key = modelKey(m.provider, m.modelId);
    if ((usage.get(key)?.totalTokens || 0) >= effectiveLimit) exhausted.add(key);
  }
  return exhausted;
}

/** Successful replies and their quota ledger commit together; partial replies log failures. */
export async function recordUsage({ userId, provider, modelId, usage }, { transaction, strict = false } = {}) {
  if (!usage) return;
  const promptTokens = Math.max(0, Math.round(Number(usage.promptTokens) || 0));
  const completionTokens = Math.max(0, Math.round(Number(usage.completionTokens) || 0));
  if (promptTokens + completionTokens === 0) return;

  try {
    await TokenUsage.create({
      userId,
      provider,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimated: Boolean(usage.estimated),
    }, { transaction });
  } catch (err) {
    if (strict) throw err;
    console.error("[Quota] Không thể ghi nhận token:", err.message);
  }
}

export const TIER_LIMITS = {
  free: 50_000,       // 50k tokens / ngày
  plus: 250_000,      // 250k tokens / ngày
  premium: 1_000_000, // 1M tokens / ngày
  // Legacy aliases
  pro: 250_000,
  vip: 1_000_000,
};

/**
 * Hệ số nhân hạn mức per-model theo gói của người dùng.
 * Free × 1  → giữ nguyên DB (30 k / 50 k / 100 k).
 * Plus × 5  → 150 k / 250 k / 500 k.
 * Premium × 20 → 600 k / 1 M / 2 M.
 */
export function getTierMultiplier(tier) {
  const t = normalizeTier(tier);
  if (t === "premium") return 20;
  if (t === "plus") return 5;
  return 1;
}

export function normalizeTier(tier) {
  if (!tier) return "free";
  const t = String(tier).toLowerCase().trim();
  if (t === "pro") return "plus";
  if (t === "vip") return "premium";
  if (["free", "plus", "premium"].includes(t)) return t;
  return "free";
}

export function getUserDailyLimit(user) {
  if (user?.customDailyTokenLimit !== null && user?.customDailyTokenLimit !== undefined && user.customDailyTokenLimit > 0) {
    return Number(user.customDailyTokenLimit);
  }
  const tier = normalizeTier(user?.userTier);
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export async function getUserTodayQuota(user) {
  const { startsAt, resetsAt } = getQuotaWindow();
  const usageMap = await getUsageByModel(user.id, startsAt);

  let usedToday = 0;
  for (const u of usageMap.values()) {
    usedToday += u.totalTokens;
  }

  const tier = normalizeTier(user.userTier);
  const dailyLimit = getUserDailyLimit(user);
  const remainingToday = Math.max(0, dailyLimit - usedToday);
  const percentUsed = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;
  const isWarning = percentUsed >= 80 && percentUsed < 100;
  const isExhausted = dailyLimit > 0 && usedToday >= dailyLimit;

  return {
    tier,
    dailyLimit,
    usedToday,
    remainingToday,
    percentUsed,
    isWarning,
    isExhausted,
    startsAt,
    resetsAt,
    timezone: getTzLabel(),
  };
}

