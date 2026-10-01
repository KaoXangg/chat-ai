export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Chỉ quản trị viên mới có quyền truy cập." } });
  }
  next();
}
