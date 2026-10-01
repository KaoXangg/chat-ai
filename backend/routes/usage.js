import express from "express";
import AIModel from "../models/AIModel.js";
import { authMiddleware } from "../middleware/auth.js";
import { getConfiguredProviders } from "../providers/aiRouter.js";
import { getQuotaWindow, getTzLabel, getUsageByModel, modelKey } from "../utils/quota.js";

const router = express.Router();
router.use(authMiddleware);

// GET /api/usage -> mức sử dụng token hôm nay của người dùng hiện tại, theo từng model đang bật.
router.get("/", async (req, res, next) => {
  try {
    const { startsAt, resetsAt } = getQuotaWindow();
    const [models, usageMap] = await Promise.all([
      AIModel.findAll({ where: { enabled: true }, order: [["priority", "ASC"]] }),
      getUsageByModel(req.user.id, startsAt),
    ]);
    const configured = getConfiguredProviders();

    const items = models.map((m) => {
      const used = usageMap.get(modelKey(m.provider, m.modelId)) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
      const limit = Number(m.dailyTokenLimit) || 0;
      const unlimited = limit <= 0;
      return {
        _id: m._id,
        provider: m.provider,
        modelId: m.modelId,
        displayName: m.displayName,
        available: configured.includes(m.provider),
        unlimited,
        limit,
        used: used.totalTokens,
        promptTokens: used.promptTokens,
        completionTokens: used.completionTokens,
        requests: used.requests,
        remaining: unlimited ? null : Math.max(0, limit - used.totalTokens),
        percentUsed: unlimited ? null : Math.min(100, Math.round((used.totalTokens / limit) * 100)),
        percentRemaining: unlimited ? null : Math.max(0, 100 - Math.round((used.totalTokens / limit) * 100)),
      };
    });

    const totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
    for (const u of usageMap.values()) {
      totals.promptTokens += u.promptTokens;
      totals.completionTokens += u.completionTokens;
      totals.totalTokens += u.totalTokens;
      totals.requests += u.requests;
    }

    res.json({
      success: true,
      data: {
        window: { startsAt, resetsAt, period: "day", timezone: getTzLabel() },
        totals,
        models: items,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
