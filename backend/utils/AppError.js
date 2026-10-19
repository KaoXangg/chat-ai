export class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dữ liệu không hợp lệ.", details = null) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = "UNAUTHORIZED", message = "Bạn chưa đăng nhập.") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = "FORBIDDEN", message = "Bạn không có quyền thực hiện hành động này.") {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Không tìm thấy tài nguyên yêu cầu.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(code = "CONFLICT", message = "Dữ liệu đã tồn tại hoặc xảy ra xung đột.", details = null) {
    super(409, code, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(codeOrMessage = "RATE_LIMITED", messageOrDetails = "Quá nhiều yêu cầu. Vui lòng thử lại sau.", details = null) {
    if (typeof codeOrMessage === "string" && /^[A-Z0-9_]+$/.test(codeOrMessage)) {
      super(
        429,
        codeOrMessage,
        typeof messageOrDetails === "string" ? messageOrDetails : "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
        details || (typeof messageOrDetails === "object" ? messageOrDetails : null)
      );
    } else {
      super(
        429,
        "RATE_LIMITED",
        typeof codeOrMessage === "string" ? codeOrMessage : "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
        messageOrDetails && typeof messageOrDetails === "object" ? messageOrDetails : details
      );
    }
  }
}
