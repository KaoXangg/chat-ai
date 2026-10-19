import express from "express";
import { Op } from "sequelize";
import { Announcement } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// Lấy danh sách các thông báo đang có hiệu lực cho người dùng
router.get("/active", async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.findAll({
      where: {
        active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { startsAt: null },
              { startsAt: { [Op.lte]: now } },
            ],
          },
          {
            [Op.or]: [
              { expiresAt: null },
              { expiresAt: { [Op.gte]: now } },
            ],
          },
        ],
      },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.json({ success: true, data: { announcements } });
  } catch (err) {
    next(err);
  }
});

export default router;
