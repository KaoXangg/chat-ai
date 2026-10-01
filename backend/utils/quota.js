import { Op, fn, col } from "sequelize";
import TokenUsage from "../models/TokenUsage.js";

const DAY_MS = 86_400_000;

/** Múi giờ dùng để tính "ngày" của hạn mức (mặc định GMT+7 = giờ Việt Nam). Đổi bằng QUOTA_TZ_OFFSET_HOURS trong .env. */
export function getTzOffsetHours() {
  const raw = process.env.QUOTA_TZ_OFFSET_HOURS;
  const n = raw !== undefined && raw !== "" ? Number(raw) : 7;
  return Number.isFinite(n) ? n : 7;
}

export function getTzLabel() {
  const h = getTzOffsetHours();
  return `GMT${h >= 0 ? "+" : ""}${h}`;
}

/** Cửa sổ hạn mức hiện tại: từ 00:00 hôm nay đến 00:00 hôm sau (theo múi giờ cấu hình). */
export function getQuotaWindow(now = Date.now()) {
  const offsetMs = getTzOffsetHours() * 3_600_000;
  const startsAt = Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
  return { startsAt: new Date(startsAt), resetsAt: new Date(startsAt + DAY_MS) };
}

// Khóa định danh model, cùng định dạng với aiRouter.js (`${provider}/${modelId}`).
export const modelKey = (provider, modelId) => `${provider}/${modelId}`;

/** Tổng token đã dùng của 1 user từ thời điểm `since`, gom theo model. Trả về Map<modelKey, {...}>. */
export async function getUsageByModel(userId, since) {
  const rows = await TokenUsage.findAll({
    attributes: [
      "provider",
      "modelId",
      [fn("SUM", col("promptTokens")), "sumPrompt"],
      [fn("SUM", col("completionTokens")), "sumCompletion"],
      [fn("SUM", col("totalTokens")), "sumTotal"],
      [fn("COUNT", col("id")), "requests"],
    ],
    where: { userId, createdAt: { [Op.gte]: since } },
    group: ["provider", "modelId"],
    raw: true,
  });

  const map = new Map();
  for (const r of rows) {
    map.set(modelKey(r.provider, r.modelId), {
      promptTokens: Number(r.sumPrompt) || 0,
      completionTokens: Number(r.sumCompletion) || 0,
      totalTokens: Number(r.sumTotal) || 0,
      requests: Number(r.requests) || 0,
    });
  }
  return map;
}

/** Tập các model mà user đã dùng hết hạn mức hôm nay (dailyTokenLimit > 0 và đã dùng >= giới hạn). */
export async function getExhaustedModels(userId, catalog) {
  const limited = catalog.filter((m) => Number(m.dailyTokenLimit) > 0);
  if (!limited.length) return new Set();

  const usage = await getUsageByModel(userId, getQuotaWindow().startsAt);
  const exhausted = new Set();
  for (const m of limited) {
    const key = modelKey(m.provider, m.modelId);
    if ((usage.get(key)?.totalTokens || 0) >= Number(m.dailyTokenLimit)) exhausted.add(key);
  }
  return exhausted;
}

/** Ghi lượng token của một lượt trả lời. Không bao giờ ném lỗi để không làm hỏng luồng chat. */
export async function recordUsage({ userId, provider, modelId, usage }) {
  if (!usage) return;
  const promptTokens = Math.max(0, Math.round(Number(usage.promptTokens) || 0));
  const completionTokens = Math.max(0, Math.round(Number(usage.completionTokens) || 0));
  if (promptTokens + completionTokens === 0) return;

  try {
    await TokenUsage.create({
      userId,
      provider,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimated: Boolean(usage.estimated),
    });
  } catch (err) {
    console.error("[Quota] Không thể ghi nhận token:", err.message);
  }
}
