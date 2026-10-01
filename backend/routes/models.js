import express from "express";
import AIModel from "../models/AIModel.js";
import { authMiddleware } from "../middleware/auth.js";
import { getConfiguredProviders } from "../providers/aiRouter.js";

const router = express.Router();

// GET /api/models -> danh sách mô hình đang bật, kèm trạng thái API key của từng nhà cung cấp.
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const models = await AIModel.findAll({ where: { enabled: true }, order: [["priority", "ASC"]] });
    const configuredProviders = getConfiguredProviders();

    const result = models.map((m) => ({
      ...m.toJSON(),
      available: configuredProviders.includes(m.provider),
    }));

    res.json({ success: true, data: { models: result } });
  } catch (err) {
    next(err);
  }
});

export default router;
