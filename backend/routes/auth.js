import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op, literal } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import { generateToken } from "../utils/generateToken.js";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { sendOtpEmail, isMailerConfigured } from "../utils/mailer.js";
import { generateRandomAvatar, isValidAvatarUrl } from "../utils/avatar.js";

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

const OTP_TTL_MS = 10 * 60 * 1000; // mã sống 10 phút
const OTP_MAX_ATTEMPTS = 5; // sai/thử quá 5 lần thì mã bị vô hiệu hóa
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // tối thiểu 60s giữa 2 lần gửi mã cho cùng một tài khoản

function generateOtp() {
  // Cận trên của randomInt là exclusive nên phải là 1_000_000 để có thể ra 999999.
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

router.post("/register", authLimiter, async (req, res, next) => {
  try {
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
    });

    const token = generateToken(user);
    res.status(201).json({ success: true, data: { user: publicUser(user), token } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng điền email và mật khẩu." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } });
    }

    if (user.status === "banned") {
      return res.status(403).json({ success: false, error: { code: "USER_BANNED", message: "Tài khoản đã bị khóa." } });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng." } });
    }

    const token = generateToken(user);
    res.json({ success: true, data: { user: publicUser(user), token } });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    // User cũ chưa có avatar: gán ngẫu nhiên 1 lần rồi lưu
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

router.patch("/me", authMiddleware, async (req, res, next) => {
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

/** Tạo avatar hoạt hình ngẫu nhiên (con vật / nhân vật cartoon) và lưu. */
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

router.post("/change-password", authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Dữ liệu không hợp lệ." } });
    }

    // authMiddleware đã loại passwordHash khỏi req.user nên phải nạp lại bản đầy đủ từ DB.
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
      const [changed] = await User.update({ passwordHash, tokenVersion: literal("tokenVersion + 1") }, {
        where: { id: full.id, passwordHash: full.passwordHash, tokenVersion: req.user.tokenVersion }, transaction,
      });
      if (!changed) throw Object.assign(new Error("Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại."), { status: 401, code: "SESSION_REVOKED" });
      await PasswordReset.update({ used: true }, { where: { userId: full.id, used: false }, transaction });
    });
    res.json({ success: true, data: { message: "Đổi mật khẩu thành công." } });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", authLimiter, async (req, res, next) => {
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
      // Chặn spam mail + chặn việc "đổi mã liên tục để có thêm lượt đoán".
      // Nếu mã hiện tại đã bị khóa do thử quá nhiều lần thì cho phép xin mã mới ngay.
      const tooSoon =
        latest &&
        latest.attempts < OTP_MAX_ATTEMPTS &&
        Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS;

      if (!tooSoon) {
        // Chỉ giữ đúng 1 mã còn hiệu lực cho mỗi user.
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

router.post("/reset-password", authLimiter, async (req, res, next) => {
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

    // Tăng bộ đếm NGUYÊN TỬ ngay trong câu UPDATE (trước khi so mã). Điều kiện attempts < MAX nằm
    // trong WHERE nên dù kẻ tấn công bắn song song nhiều request, tổng số lần so mã không vượt MAX.
    const [claimed] = await PasswordReset.update(
      { attempts: literal("attempts + 1") },
      { where: { id: reset.id, used: false, attempts: { [Op.lt]: OTP_MAX_ATTEMPTS } } }
    );
    if (claimed === 0) return lockedOtp();

    if (!safeEqualHex(reset.otpHash, hashOtp(String(otp).trim()))) return invalidOtp();

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // Consuming the OTP, changing the password and revoking sessions commit together.
    const changed = await sequelize.transaction(async (transaction) => {
      const [consumed] = await PasswordReset.update({ used: true }, {
        where: { id: reset.id, used: false, expiresAt: { [Op.gt]: new Date() } }, transaction,
      });
      if (consumed === 0) return false;
      await User.update({ passwordHash, tokenVersion: literal("tokenVersion + 1") }, { where: { id: user.id }, transaction });
      await PasswordReset.update({ used: true }, { where: { userId: user.id, used: false }, transaction });
      return true;
    });
    if (!changed) return invalidOtp();

    res.json({ success: true, data: { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." } });
  } catch (err) {
    next(err);
  }
});

export default router;
