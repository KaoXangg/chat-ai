export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy địa chỉ API." } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (["SequelizeValidationError", "SequelizeUniqueConstraintError"].includes(err.name)) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.name === "SequelizeUniqueConstraintError" ? "DUPLICATE_VALUE" : "VALIDATION_ERROR",
        message: err.name === "SequelizeUniqueConstraintError"
          ? "Giá trị đã tồn tại. Vui lòng dùng giá trị khác."
          : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
        fields: [...new Set((err.errors || []).map((item) => item.path).filter(Boolean))],
      },
    });
  }
  console.error("[ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Đã xảy ra lỗi. Vui lòng thử lại." : err.message,
    },
  });
}
