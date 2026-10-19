import crypto from "crypto";
import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
export const REFRESH_TOKEN_DAYS_REMEMBER = 30; // 30 ngày nếu chọn ghi nhớ đăng nhập
export const REFRESH_TOKEN_DAYS_DEFAULT = 7;   // 7 ngày nếu không chọn ghi nhớ

/**
 * Tạo Access Token có thời hạn ngắn (mặc định 15 phút)
 */
export function generateAccessToken(user, sessionToken = null, expiresIn = ACCESS_TOKEN_EXPIRY) {
  return jwt.sign(
    {
      id: user._id || String(user.id),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
      sessionToken: sessionToken || undefined,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Giữ hàm cũ để tương thích ngược
 */
export function generateToken(user, expiresIn = null) {
  return generateAccessToken(user, null, expiresIn || process.env.JWT_EXPIRES_IN || "7d");
}

/**
 * Sinh chuỗi ngẫu nhiên bảo mật cao làm Refresh Token
 */
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

/**
 * Hash Refresh Token bằng SHA-256 để lưu trữ an toàn trong Database
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function generate2FAChallenge(user, rememberMe = false) {
  return jwt.sign(
    { userId: user.id, purpose: "2fa_challenge", rememberMe: Boolean(rememberMe) },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}
