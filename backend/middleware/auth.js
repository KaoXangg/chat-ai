import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isSqlId } from "../utils/validation.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, error: { code: "NO_TOKEN", message: "Bạn chưa đăng nhập." } });
    }

    if (!process.env.JWT_SECRET) throw new Error("Chưa cấu hình JWT_SECRET.");
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded || !isSqlId(decoded.id)) {
      return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Mã xác thực không hợp lệ." } });
    }
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ["passwordHash"] } });

    if (!user) {
      return res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." } });
    }
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, error: { code: "SESSION_REVOKED", message: "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại." } });
    }
    if (user.status === "banned") {
      return res.status(403).json({ success: false, error: { code: "USER_BANNED", message: "Tài khoản đã bị khóa." } });
    }

    req.user = user;
    next();
  } catch (err) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name)) {
      return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Mã xác thực không hợp lệ hoặc đã hết hạn." } });
    }
    next(err);
  }
}
