import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, error: { code: "NO_TOKEN", message: "Bạn chưa đăng nhập." } });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ["passwordHash"] } });

    if (!user) {
      return res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    if (user.status === "banned") {
      return res.status(403).json({ success: false, error: { code: "USER_BANNED", message: "Tài khoản đã bị khóa." } });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Mã xác thực không hợp lệ hoặc đã hết hạn." } });
  }
}
