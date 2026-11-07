import { Op } from "sequelize";
import Session from "../models/Session.js";
import PasswordReset from "../models/PasswordReset.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 giờ

/**
 * Dọn dẹp các phiên đăng nhập (Sessions) đã thu hồi/hết hạn và mã OTP (PasswordResets) cũ.
 */
export async function runDatabaseCleanup() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [deletedSessions, deletedResets] = await Promise.all([
    Session.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: now } },
          { isRevoked: true, updatedAt: { [Op.lt]: sevenDaysAgo } },
        ],
      },
    }),
    PasswordReset.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: oneDayAgo } },
          { used: true, updatedAt: { [Op.lt]: oneDayAgo } },
        ],
      },
    }),
  ]);

  return {
    deletedSessions: Number(deletedSessions) || 0,
    deletedPasswordResets: Number(deletedResets) || 0,
    cleanedAt: now.toISOString(),
  };
}

let cleanupTimer = null;

export function startPeriodicCleanup(intervalMs = DEFAULT_INTERVAL_MS) {
  if (cleanupTimer) return cleanupTimer;
  cleanupTimer = setInterval(async () => {
    try {
      const { deletedSessions, deletedPasswordResets } = await runDatabaseCleanup();
      if (deletedSessions > 0 || deletedPasswordResets > 0) {
        console.log(
          `[Cleanup] Đã dọn ${deletedSessions} phiên hết hạn và ${deletedPasswordResets} bản ghi OTP cũ.`
        );
      }
    } catch (err) {
      console.warn("[Cleanup] Lỗi khi dọn dẹp định kỳ:", err?.message);
    }
  }, intervalMs);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
  return cleanupTimer;
}

