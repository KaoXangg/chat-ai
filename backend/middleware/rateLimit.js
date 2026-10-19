import rateLimit from "express-rate-limit";

const isTest =
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test" ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.includes("--test") ||
  process.execArgv.includes("--test");

const rateLimitedResponse = (message) => (req, res) => {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message,
      details: [],
    },
  });
};

/**
 * 1. Global API Limiter: 600 requests / 15 minutes per IP (skips /api/chat which has chatLimiter)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : (Number(process.env.RATE_LIMIT_API_MAX) || 600),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    isTest ||
    req.originalUrl?.startsWith("/api/chat") ||
    req.baseUrl?.startsWith("/api/chat") ||
    req.path?.startsWith("/chat"),
  handler: rateLimitedResponse("Quá nhiều yêu cầu đến hệ thống. Vui lòng thử lại sau 15 phút."),
});

/**
 * 2. Login Limiter: 5 failed attempts / 15 minutes per (IP + email)
 * Chỉ đếm request thất bại (`skipSuccessfulRequests: true`)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : (Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return `${req.ip}_${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút."),
});

/**
 * 3. Register Limiter: 5 registrations / 1 hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : (Number(process.env.RATE_LIMIT_REGISTER_MAX) || 5),
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Bạn đã tạo quá nhiều tài khoản trong thời gian ngắn. Vui lòng thử lại sau 1 giờ."),
});

/**
 * 4. Forgot / Reset Password Limiter: 3 requests / 1 hour per (IP + email)
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : (Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX) || 3),
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return `${req.ip}_${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Quá nhiều yêu cầu khôi phục mật khẩu cho email này. Vui lòng thử lại sau 1 giờ."),
});

/**
 * 5. Generic Auth Limiter: for 2FA verification/resend (20 requests / 15 minutes)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau."),
});

/**
 * 6. Chat Limiter: per user/IP per minute
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : (Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE) || 10),
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một phút rồi thử lại."),
});

/**
 * 7. Share Limiter: per IP per minute
 */
export const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : (Number(process.env.SHARE_RATE_LIMIT_PER_MINUTE) || 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: rateLimitedResponse("Quá nhiều yêu cầu truy cập chia sẻ. Vui lòng thử lại sau."),
});