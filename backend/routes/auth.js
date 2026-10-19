import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op, literal } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import Session from "../models/Session.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generate2FAChallenge,
  REFRESH_TOKEN_DAYS_REMEMBER,
  REFRESH_TOKEN_DAYS_DEFAULT,
} from "../utils/generateToken.js";
import { parseUserAgent } from "../utils/userAgent.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  authLimiter,
} from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verify2FASchema,
  resend2FASchema,
} from "../validators/auth.schema.js";
import { sendOtpEmail, send2faOtpEmail, isMailerConfigured } from "../utils/mailer.js";
import { generateRandomAvatar, isValidAvatarUrl } from "../utils/avatar.js";
import { getSystemSettings } from "../models/SystemSetting.js";

const router = express.Router();
const DUMMY_HASH = bcrypt.hashSync("không-dùng", 10);

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${"*".repeat(Math.min(user.length - 2, 5))}${user.slice(-1)}@${domain}`;
}

const twoFactorStore = new Map();
const TWO_FACTOR_TTL_MS = 5 * 60 * 1000; // 5 phút
const TWO_FACTOR_MAX_ATTEMPTS = 5;

function publicUser(user) {
  return {
    id: user._id || String(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    userTier: user.userTier || "free",
    customDailyTokenLimit: user.customDailyTokenLimit ?? null,
    createdAt: user.createdAt,
  };
}

const OTP_TTL_MS = 10 * 60 * 1000; // mã sống 10 phút
const OTP_MAX_ATTEMPTS = 5; // sai/thử quá 5 lần thì mã bị vô hiệu hóa
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // tối thiểu 60s giữa 2 lần gửi mã cho cùng một tài khoản

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function safeEqualHex(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Tạo phiên đăng nhập (Session) và sinh cặp Access Token + Refresh Token
 */
async function createSessionAndTokens(user, req, res, rememberMe = false) {
  const { deviceType, os, browser } = parseUserAgent(req.headers["user-agent"]);
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] ? req.headers["user-agent"].slice(0, 500) : null;

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  const days = rememberMe ? REFRESH_TOKEN_DAYS_REMEMBER : REFRESH_TOKEN_DAYS_DEFAULT;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    userId: user.id,
    sessionToken,
    refreshTokenHash,
    deviceType,
    os,
    browser,
    ipAddress,
    userAgent,
    rememberMe: Boolean(rememberMe),
    lastActiveAt: new Date(),
    expiresAt,
  });

  const accessToken = generateAccessToken(user, sessionToken);

  // Đặt cookie HttpOnly cho Refresh Token
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: days * 24 * 60 * 60 * 1000,
  });

  return {
    token: accessToken,
    sessionId: session.id,
    sessionToken,
    expiresAt,
  };
}

router.post("/register", registerLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const settings = await getSystemSettings();
    if (settings.allowRegistration === false) {
      return res.status(403).json({
        success: false,
        error: { code: "REGISTRATION_DISABLED", message: "Hệ thống hiện đang tạm đóng đăng ký người dùng mới." },
      });
    }

    const { username, email, password } = req.body;

    if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string" || !username.trim() || !email.trim() || !password) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng điền đầy đủ thông tin." } });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: "WEAK_PASSWORD", message: "Mật khẩu phải có ít nhất 6 ký tự." } });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: "EMAIL_TAKEN", message: "Email đã được sử dụng." } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      avatar: generateRandomAvatar(),
      customDailyTokenLimit: settings.defaultUserDailyTokens || null,
      userTier: "free",
    });

    const authData = await createSessionAndTokens(user, req, res, false);
    res.status(201).json({
      success: true,
      data: {
        user: publicUser(user),
        token: authData.token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng điền email và mật khẩu." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } });
    }

    if (user.status === "banned") {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } });
      }
      return res.status(403).json({ success: false, error: { code: "USER_BANNED", message: "Tài khoản đã bị khóa." } });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } });
    }

    const settings = await getSystemSettings();
    if (settings.maintenanceMode && user.role !== "admin") {
      return res.status(503).json({
        success: false,
        error: { code: "MAINTENANCE_MODE", message: settings.maintenanceMessage || "Hệ thống đang bảo trì." },
      });
    }

    // NẾU TÀI KHOẢN LÀ ADMIN -> KÍCH HOẠT BẢO MẬT 2 LỚP (2FA)
    if (user.role === "admin") {
      const otp = generateOtp();
      const challengeToken = generate2FAChallenge(user, rememberMe);

      twoFactorStore.set(user.id, {
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + TWO_FACTOR_TTL_MS,
        attempts: 0,
        lastSentAt: Date.now(),
        rememberMe: Boolean(rememberMe),
      });

      let mailSent = false;
      if (isMailerConfigured()) {
        try {
          await send2faOtpEmail(user.email, otp);
          mailSent = true;
        } catch (mailErr) {
          console.warn("[2FA] Lỗi gửi email OTP:", mailErr?.message);
        }
      }

      const isDevFallback = !mailSent && process.env.NODE_ENV !== "production";
      if (isDevFallback) {
        console.log(`\n======================================================\n[2FA ADMIN LOGIN] Tài khoản: ${user.email}\nMã OTP xác thực 2 bước: ${otp}\n======================================================\n`);
      }

      return res.json({
        success: true,
        require2FA: true,
        challengeToken,
        emailMasked: maskEmail(user.email),
        message: mailSent
          ? "Mã xác thực 2 bước (2FA) đã được gửi tới email của bạn."
          : "Hệ thống đã tạo mã xác thực 2 bước cho tài khoản Admin.",
        devOtp: isDevFallback ? otp : undefined,
      });
    }

    // CẤP CẶP ACCESS TOKEN + REFRESH TOKEN VÀ TẠO PHIÊN ĐĂNG NHẬP (SESSION)
    const authData = await createSessionAndTokens(user, req, res, rememberMe);
    res.json({
      success: true,
      data: {
        user: publicUser(user),
        token: authData.token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-2fa", authLimiter, validate(verify2FASchema), async (req, res, next) => {
  try {
    const { challengeToken, otp } = req.body;
    if (!challengeToken || !otp) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng nhập đầy đủ mã OTP." } });
    }

    let payload;
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return res.status(401).json({ success: false, error: { code: "CHALLENGE_EXPIRED", message: "Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại." } });
    }

    if (payload.purpose !== "2fa_challenge") {
      return res.status(400).json({ success: false, error: { code: "INVALID_CHALLENGE", message: "Yêu cầu xác thực không hợp lệ." } });
    }

    const challenge = twoFactorStore.get(payload.userId);
    if (!challenge || challenge.expiresAt < Date.now()) {
      twoFactorStore.delete(payload.userId);
      return res.status(401).json({ success: false, error: { code: "CHALLENGE_EXPIRED", message: "Mã xác thực đã hết hạn. Vui lòng thử lại." } });
    }

    if (challenge.attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      twoFactorStore.delete(payload.userId);
      return res.status(429).json({ success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Bạn đã nhập sai quá số lần quy định. Vui lòng đăng nhập lại." } });
    }

    const inputHash = hashOtp(String(otp).trim());
    if (!safeEqualHex(inputHash, challenge.otpHash)) {
      challenge.attempts += 1;
      const remaining = TWO_FACTOR_MAX_ATTEMPTS - challenge.attempts;
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_OTP", message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` },
      });
    }

    twoFactorStore.delete(payload.userId);

    const user = await User.findByPk(payload.userId);
    if (!user || user.status === "banned") {
      return res.status(403).json({ success: false, error: { code: "USER_INVALID", message: "Tài khoản không hợp lệ hoặc đã bị khóa." } });
    }

    const authData = await createSessionAndTokens(user, req, res, challenge.rememberMe);
    res.json({
      success: true,
      data: {
        user: publicUser(user),
        token: authData.token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/resend-2fa", authLimiter, validate(resend2FASchema), async (req, res, next) => {
  try {
    const { challengeToken } = req.body;
    if (!challengeToken) {
      return res.status(400).json({ success: false, error: { code: "MISSING_CHALLENGE", message: "Thiếu thông tin phiên xác thực." } });
    }

    let payload;
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return res.status(401).json({ success: false, error: { code: "CHALLENGE_EXPIRED", message: "Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại." } });
    }

    const challenge = twoFactorStore.get(payload.userId);
    if (!challenge) {
      return res.status(400).json({ success: false, error: { code: "CHALLENGE_NOT_FOUND", message: "Không tìm thấy phiên xác thực. Vui lòng đăng nhập lại." } });
    }

    if (Date.now() - challenge.lastSentAt < 60000) {
      const waitSec = Math.ceil((60000 - (Date.now() - challenge.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: { code: "RESEND_COOLDOWN", message: `Vui lòng đợi ${waitSec} giây trước khi gửi lại mã.` },
      });
    }

    const user = await User.findByPk(payload.userId);
    if (!user || user.status === "banned") {
      return res.status(403).json({ success: false, error: { code: "USER_INVALID", message: "Tài khoản không hợp lệ." } });
    }

    const otp = generateOtp();
    challenge.otpHash = hashOtp(otp);
    challenge.expiresAt = Date.now() + TWO_FACTOR_TTL_MS;
    challenge.lastSentAt = Date.now();
    twoFactorStore.set(user.id, challenge);

    let mailSent = false;
    if (isMailerConfigured()) {
      try {
        await send2faOtpEmail(user.email, otp);
        mailSent = true;
      } catch (mailErr) {
        console.warn("[2FA] Lỗi gửi lại email OTP:", mailErr?.message);
      }
    }

    const isDevFallback = !mailSent && process.env.NODE_ENV !== "production";
    if (isDevFallback) {
      console.log(`\n======================================================\n[2FA ADMIN RESEND] Tài khoản: ${user.email}\nMã OTP xác thực 2 bước mới: ${otp}\n======================================================\n`);
    }

    res.json({
      success: true,
      data: {
        message: mailSent ? "Mã xác thực mới đã được gửi tới email." : "Mã xác thực mới đã được tạo.",
        devOtp: isDevFallback ? otp : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Endpoint làm mới Access Token từ Refresh Token (lưu trong HttpOnly Cookie hoặc gửi qua body)
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken;

    if (!rawToken || typeof rawToken !== "string") {
      return res.status(401).json({
        success: false,
        error: { code: "NO_REFRESH_TOKEN", message: "Không tìm thấy refresh token." },
      });
    }

    const tokenHash = hashToken(rawToken.trim());
    const session = await Session.findOne({
      where: {
        refreshTokenHash: tokenHash,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: User, as: "user" }],
    });

    if (!session || !session.user || session.user.status === "banned") {
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({
        success: false,
        error: {
          code: "SESSION_EXPIRED",
          message: "Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.",
        },
      });
    }

    // Cập nhật thông tin phiên hoạt động gần nhất
    session.lastActiveAt = new Date();
    session.ipAddress = req.ip || req.headers["x-forwarded-for"] || session.ipAddress;
    await session.save();

    const accessToken = generateAccessToken(session.user, session.sessionToken);

    res.json({
      success: true,
      data: {
        token: accessToken,
        user: publicUser(session.user),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Đăng xuất: Thu hồi phiên đăng nhập hiện tại và xóa cookie
 */
router.post("/logout", async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken && typeof rawToken === "string") {
      const tokenHash = hashToken(rawToken.trim());
      await Session.update({ isRevoked: true }, { where: { refreshTokenHash: tokenHash } });
    }

    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.decode(header.slice(7));
        if (decoded?.sessionToken) {
          await Session.update({ isRevoked: true }, { where: { sessionToken: decoded.sessionToken } });
        }
      } catch {}
    }

    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.json({ success: true, message: "Đã đăng xuất thành công." });
  } catch (err) {
    next(err);
  }
});

/**
 * Lấy danh sách các phiên đăng nhập (thiết bị) đang hoạt động của người dùng
 */
router.get("/sessions", authMiddleware, async (req, res, next) => {
  try {
    const sessions = await Session.findAll({
      where: {
        userId: req.user.id,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["lastActiveAt", "DESC"]],
    });

    const currentToken = req.sessionToken;
    const currentId = req.sessionId;

    const data = sessions.map((s) => ({
      id: s.id,
      deviceType: s.deviceType || "desktop",
      os: s.os || "Khác",
      browser: s.browser || "Trình duyệt khác",
      ipAddress: s.ipAddress || "",
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      rememberMe: Boolean(s.rememberMe),
      isCurrent: Boolean((currentId && s.id === currentId) || (currentToken && s.sessionToken === currentToken)),
    }));

    res.json({ success: true, data: { sessions: data } });
  } catch (err) {
    next(err);
  }
});

/**
 * Thu hồi / Đăng xuất khỏi một thiết bị cụ thể
 */
router.delete("/sessions/:id", authMiddleware, async (req, res, next) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiên đăng nhập." });
    }

    session.isRevoked = true;
    await session.save();

    if (session.sessionToken === req.sessionToken) {
      res.clearCookie("refreshToken", { path: "/api/auth" });
    }

    res.json({ success: true, message: "Đã đăng xuất khỏi thiết bị." });
  } catch (err) {
    next(err);
  }
});

/**
 * Đăng xuất khỏi TẤT CẢ các thiết bị khác (trừ thiết bị hiện tại)
 */
router.delete("/sessions", authMiddleware, async (req, res, next) => {
  try {
    const currentId = req.sessionId;
    const where = {
      userId: req.user.id,
      isRevoked: false,
    };
    if (currentId) {
      where.id = { [Op.ne]: currentId };
    }

    await Session.update({ isRevoked: true }, { where });

    res.json({ success: true, message: "Đã đăng xuất khỏi tất cả các thiết bị khác." });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user.avatar) {
      const full = await User.findByPk(req.user.id);
      if (full && !full.avatar) {
        full.avatar = generateRandomAvatar();
        await full.save();
        req.user.avatar = full.avatar;
      }
    }
    res.json({ success: true, data: { user: publicUser(req.user) } });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", authMiddleware, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    if (username) full.username = username;
    if (avatar !== undefined) {
      if (avatar && !isValidAvatarUrl(avatar)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_AVATAR", message: "Avatar không hợp lệ. Hãy dùng nút đổi avatar ngẫu nhiên." },
        });
      }
      full.avatar = avatar || "";
    }
    await full.save();
    res.json({ success: true, data: { user: publicUser(full) } });
  } catch (err) {
    next(err);
  }
});

router.post("/avatar/random", authMiddleware, async (req, res, next) => {
  try {
    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    full.avatar = generateRandomAvatar();
    await full.save();
    res.json({ success: true, data: { user: publicUser(full) } });
  } catch (err) {
    next(err);
  }
});

router.post("/change-password", authMiddleware, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Dữ liệu không hợp lệ." } });
    }

    const full = await User.findByPk(req.user.id);
    if (!full) {
      return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }

    const match = await bcrypt.compare(currentPassword, full.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: { code: "WRONG_PASSWORD", message: "Mật khẩu hiện tại không đúng." } });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await sequelize.transaction(async (transaction) => {
      const [changed] = await User.update(
        { passwordHash, tokenVersion: literal("tokenVersion + 1") },
        { where: { id: full.id, passwordHash: full.passwordHash, tokenVersion: req.user.tokenVersion }, transaction }
      );
      if (!changed) throw Object.assign(new Error("Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại."), { status: 401, code: "SESSION_REVOKED" });
      await PasswordReset.update({ used: true }, { where: { userId: full.id, used: false }, transaction });
      // Thu hồi tất cả phiên đăng nhập cũ ngoại trừ phiên hiện tại (nếu có)
      await Session.update({ isRevoked: true }, { where: { userId: full.id }, transaction });
    });

    res.json({ success: true, data: { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." } });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, error: { code: "MISSING_EMAIL", message: "Vui lòng nhập email." } });
    }
    if (!isMailerConfigured()) {
      return res.status(503).json({ success: false, error: { code: "MAILER_NOT_CONFIGURED", message: "Chức năng gửi email chưa được cấu hình." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user) {
      const latest = await PasswordReset.findOne({
        where: { userId: user.id, used: false },
        order: [["createdAt", "DESC"]],
      });

      const tooSoon =
        latest &&
        latest.attempts < OTP_MAX_ATTEMPTS &&
        Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS;

      if (!tooSoon) {
        await PasswordReset.update({ used: true }, { where: { userId: user.id, used: false } });

        const otp = generateOtp();
        await PasswordReset.create({
          userId: user.id,
          otpHash: hashOtp(otp),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        });
        sendOtpEmail(user.email, otp).catch((err) => console.error("[Mailer]", err.message));
      }
    }

    res.json({ success: true, data: { message: "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi." } });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", forgotPasswordLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (typeof email !== "string" || typeof otp !== "string" || typeof newPassword !== "string" || !email.trim() || !/^\d{6}$/.test(otp.trim()) || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Dữ liệu không hợp lệ." } });
    }

    const invalidOtp = () =>
      res.status(400).json({ success: false, error: { code: "INVALID_OTP", message: "Mã xác nhận không đúng hoặc đã hết hạn." } });
    const lockedOtp = () =>
      res.status(400).json({
        success: false,
        error: { code: "OTP_LOCKED", message: "Bạn đã nhập sai quá nhiều lần. Mã đã bị vô hiệu hóa, vui lòng yêu cầu mã mới." },
      });

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) return invalidOtp();

    const reset = await PasswordReset.findOne({
      where: { userId: user.id, used: false },
      order: [["createdAt", "DESC"]],
    });

    if (!reset || reset.expiresAt < new Date()) return invalidOtp();
    if (reset.attempts >= OTP_MAX_ATTEMPTS) return lockedOtp();

    const [claimed] = await PasswordReset.update(
      { attempts: literal("attempts + 1") },
      { where: { id: reset.id, used: false, attempts: { [Op.lt]: OTP_MAX_ATTEMPTS } } }
    );
    if (claimed === 0) return lockedOtp();

    if (!safeEqualHex(reset.otpHash, hashOtp(String(otp).trim()))) return invalidOtp();

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const changed = await sequelize.transaction(async (transaction) => {
      const [consumed] = await PasswordReset.update({ used: true }, {
        where: { id: reset.id, used: false, expiresAt: { [Op.gt]: new Date() } }, transaction,
      });
      if (consumed === 0) return false;
      await User.update({ passwordHash, tokenVersion: literal("tokenVersion + 1") }, { where: { id: user.id }, transaction });
      await PasswordReset.update({ used: true }, { where: { userId: user.id, used: false }, transaction });
      await Session.update({ isRevoked: true }, { where: { userId: user.id }, transaction });
      return true;
    });
    if (!changed) return invalidOtp();

    res.json({ success: true, data: { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." } });
  } catch (err) {
    next(err);
  }
});

export default router;