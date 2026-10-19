import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Không tìm thấy địa chỉ API.",
    },
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu yêu cầu không hợp lệ.",
        details,
      },
    });
  }

  // 2. Custom AppError and its subclasses
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // 3. Body parser errors (JSON syntax or payload too large)
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Nội dung yêu cầu quá lớn.",
      },
    });
  }

  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400 && "body" in err)) {
    return res.status(400).json({
      error: {
        code: "INVALID_INPUT",
        message: "Nội dung gửi lên không phải JSON hợp lệ.",
      },
    });
  }

  // 4. CORS errors
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      error: {
        code: "CORS_NOT_ALLOWED",
        message: err.message || "Nguồn gốc yêu cầu (Origin) không được phép truy cập API.",
      },
    });
  }

  // 5. Sequelize errors
  if (["SequelizeValidationError", "SequelizeUniqueConstraintError"].includes(err.name)) {
    const fields = [...new Set((err.errors || []).map((item) => item.path).filter(Boolean))];
    return res.status(400).json({
      ...(req?.chatMutation ? { data: req.chatMutation } : {}),
      error: {
        code: err.name === "SequelizeUniqueConstraintError" ? "DUPLICATE_VALUE" : "VALIDATION_ERROR",
        message: err.name === "SequelizeUniqueConstraintError"
          ? "Giá trị đã tồn tại. Vui lòng dùng giá trị khác."
          : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
        fields,
      },
    });
  }

  if (err.name === "SequelizeConnectionAcquireTimeoutError" || err.name === "SequelizeConnectionError") {
    res.set("Retry-After", "3");
    return res.status(503).json({
      error: {
        code: "SERVER_BUSY",
        message: "Máy chủ đang bận. Vui lòng thử lại sau ít giây.",
      },
    });
  }

  // 6. JWT errors
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Mã xác thực đã hết hạn. Vui lòng đăng nhập lại.",
      },
    });
  }

  if (["JsonWebTokenError", "NotBeforeError"].includes(err.name)) {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Mã xác thực không hợp lệ.",
      },
    });
  }

  // 7. Fallback: 5xx or unhandled errors
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (status >= 500) {
    const userIdentifier = req.user?.id ? `[User #${req.user.id}] ` : "";
    console.error(`[ERROR 5xx] ${req.method} ${req.originalUrl || req.url} ${userIdentifier}:`, err);
  }

  return res.status(status).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: status >= 500 && isProd ? "Internal server error" : (err.message || "Đã xảy ra lỗi."),
      ...(!isProd && status >= 500 && err.stack ? { stack: err.stack } : {}),
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
