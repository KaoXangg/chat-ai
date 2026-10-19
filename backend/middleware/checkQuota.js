import { TooManyRequestsError } from "../utils/AppError.js";
import { getUserTodayQuota } from "../utils/quota.js";

/**
 * Asserts that the user has daily quota remaining.
 * Sets warning / retry headers on res and throws TooManyRequestsError("QUOTA_EXCEEDED") if exhausted.
 */
export async function assertUserQuota(user, res) {
  if (!user) return null;

  const userQuota = await getUserTodayQuota(user);
  const nowMs = Date.now();
  const resetAtDate = userQuota.resetsAt instanceof Date ? userQuota.resetsAt : new Date(userQuota.resetsAt);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtDate.getTime() - nowMs) / 1000));

  if (userQuota.isExhausted) {
    if (res && typeof res.setHeader === "function") {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-Quota-Remaining", "0");
      res.setHeader("X-Quota-Limit", String(userQuota.dailyLimit));
    }

    const details = {
      tier: userQuota.tier,
      limit: userQuota.dailyLimit,
      used: userQuota.usedToday,
      remaining: 0,
      resetAt: resetAtDate.toISOString(),
      upgradeAvailable: userQuota.tier !== "premium" && userQuota.tier !== "vip",
    };

    throw new TooManyRequestsError(
      "QUOTA_EXCEEDED",
      `Bạn đã dùng hết hạn mức ${userQuota.dailyLimit.toLocaleString("vi-VN")} token hôm nay (${userQuota.tier.toUpperCase()}). Hạn mức sẽ tự động làm mới lúc 00:00 (${userQuota.timezone}).`,
      details
    );
  }

  // Warning headers (>= 80% used)
  if (userQuota.percentUsed >= 80 && res && typeof res.setHeader === "function") {
    res.setHeader("X-Quota-Remaining", String(userQuota.remainingToday));
    res.setHeader("X-Quota-Limit", String(userQuota.dailyLimit));
  }

  return userQuota;
}

/**
 * Middleware: Verify quota before calling AI provider.
 * Runs AFTER auth and validation, BEFORE SSE headers and AI calls.
 */
export async function checkQuotaMiddleware(req, res, next) {
  try {
    await assertUserQuota(req.user, res);
    next();
  } catch (err) {
    next(err);
  }
}
