import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng điền đầy đủ thông tin." } });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: "WEAK_PASSWORD", message: "Mật khẩu phải có ít nhất 6 ký tự." } });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: "EMAIL_TAKEN", message: "Email đã được sử dụng." } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
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
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Vui lòng điền email và mật khẩu." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
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
    if (!currentPassword || !newPassword || newPassword.length < 6) {
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

    full.passwordHash = await bcrypt.hash(newPassword, 10);
    await full.save();
    res.json({ success: true, data: { message: "Đổi mật khẩu thành công." } });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { code: "MISSING_EMAIL", message: "Vui lòng nhập email." } });
    }
    if (!isMailerConfigured()) {
      return res.status(503).json({ success: false, error: { code: "MAILER_NOT_CONFIGURED", message: "Chức năng gửi email chưa được cấu hình." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (user) {
      const otp = generateOtp();
      await PasswordReset.create({
        userId: user.id,
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      sendOtpEmail(user.email, otp).catch((err) => console.error("[Mailer]", err.message));
    }

    res.json({ success: true, data: { message: "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi." } });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", authLimiter, async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Dữ liệu không hợp lệ." } });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(400).json({ success: false, error: { code: "INVALID_OTP", message: "Mã xác nhận không đúng hoặc đã hết hạn." } });
    }

    const reset = await PasswordReset.findOne({
      where: { userId: user.id, used: false },
      order: [["createdAt", "DESC"]],
    });

    if (!reset || reset.expiresAt < new Date() || reset.otpHash !== hashOtp(otp)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_OTP", message: "Mã xác nhận không đúng hoặc đã hết hạn." } });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    reset.used = true;
    await reset.save();

    res.json({ success: true, data: { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." } });
  } catch (err) {
    next(err);
  }
});

export default router;