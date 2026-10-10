export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy địa chỉ API." } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(err.status).json({ success: false, error: { code: "INVALID_INPUT", message: err.type === "entity.too.large" ? "Nội dung yêu cầu quá lớn." : "JSON không hợp lệ." } });
  }
  if (["SequelizeValidationError", "SequelizeUniqueConstraintError"].includes(err.name)) {
    return res.status(400).json({
      success: false,
      ...(req.chatMutation ? { data: req.chatMutation } : {}),
      error: {
        code: err.name === "SequelizeUniqueConstraintError" ? "DUPLICATE_VALUE" : "VALIDATION_ERROR",
        message: err.name === "SequelizeUniqueConstraintError"
          ? "Giá trị đã tồn tại. Vui lòng dùng giá trị khác."
          : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
        fields: [...new Set((err.errors || []).map((item) => item.path).filter(Boolean))],
      },
    });
  }
  const status = err.status || 500;
  if (status >= 500) console.error("[ERROR]", err.name, err.message);
  res.status(status).json({
    success: false,
    ...(req.chatMutation ? { data: req.chatMutation } : {}),
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Đã xảy ra lỗi. Vui lòng thử lại." : err.message,
    },
  });
}
