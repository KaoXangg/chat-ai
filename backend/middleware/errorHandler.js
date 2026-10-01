export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy địa chỉ API." } });
}

export function errorHandler(err, req, res, next) {
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
