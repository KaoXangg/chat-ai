import rateLimit from "express-rate-limit";

// Gioi han so request chat / user / phut de tranh 1 user lam can quota AI free
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE) || 10,
  keyGenerator: (req) => (req.user ? String(req.user._id) : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một phút rồi thử lại." },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
    });
  },
});
