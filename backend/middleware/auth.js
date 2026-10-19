import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
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

    // Kiểm tra tính hợp lệ của phiên làm việc (Session) nếu token có sessionToken
    if (decoded.sessionToken) {
      const session = await Session.findOne({ where: { sessionToken: decoded.sessionToken } });
      if (!session || session.isRevoked || new Date(session.expiresAt) <= new Date()) {
        return res.status(401).json({
          success: false,
          error: { code: "SESSION_REVOKED", message: "Phiên đăng nhập này đã bị thu hồi hoặc hết hạn." },
        });
      }
      req.session = session;
      req.sessionId = session.id;
      req.sessionToken = session.sessionToken;

      // Cập nhật lastActiveAt nếu lần hoạt động cuối cách hơn 3 phút (giảm tải ghi DB)
      const now = Date.now();
      if (now - new Date(session.lastActiveAt).getTime() > 3 * 60 * 1000) {
        session.lastActiveAt = new Date();
        session.ipAddress = req.ip || req.headers["x-forwarded-for"] || session.ipAddress;
        session.save().catch(() => {});
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Mã xác thực đã hết hạn. Vui lòng làm mới token." },
      });
    }
    if (["JsonWebTokenError", "NotBeforeError"].includes(err.name)) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Mã xác thực không hợp lệ." },
      });
    }
    next(err);
  }
}
