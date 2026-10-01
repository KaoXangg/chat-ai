import { GroqProvider } from "./groqProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { OpenRouterProvider } from "./openrouterProvider.js";
import { computeInputBudget, trimMessagesToBudget } from "../utils/contextTrimmer.js";

const providers = {
  groq: new GroqProvider(),
  gemini: new GeminiProvider(),
  openrouter: new OpenRouterProvider(),
};

const TITLE_CHAIN = ["gemini", "groq", "openrouter"];

// Chỉ dùng khi bảng AIModels trống (chưa seed), để hệ thống vẫn chạy được.
const LEGACY_ORDER = ["groq", "gemini", "openrouter"];
const LEGACY_MODELS = {
  groq: "openai/gpt-oss-20b",
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/free",
};

// Provider thực sự gửi được ảnh (Groq/OpenRouter adapter chỉ nhận text).
const IMAGE_PROVIDERS = new Set(["gemini"]);

// Provider vừa bị giới hạn tốc độ/hết quota sẽ được tạm bỏ qua để các request sau không phải chờ lỗi lại.
const RATE_LIMIT_COOLDOWN_MS = 30_000;
const cooldownUntil = {};

export const AI_ERROR_CODES = {
  RATE_LIMITED: "RATE_LIMITED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
};

/** Nhận diện lỗi giới hạn tốc độ / hết quota từ OpenAI SDK, Groq SDK và Google Generative AI. */
export function isRateLimitError(err) {
  if (!err) return false;
  if (err.status === 429 || err.statusCode === 429 || err.code === 429) return true;
  const text = `${err.message || ""} ${err.code || ""}`;
  return /\b429\b|rate.?limit|too many requests|quota|RESOURCE_EXHAUSTED/i.test(text);
}

export function getConfiguredProviders() {
  return Object.entries(providers)
    .filter(([, p]) => p.isConfigured())
    .map(([name]) => name);
}

export function isProviderConfigured(name) {
  return providers[name]?.isConfigured() || false;
}

function legacyCatalog() {
  return LEGACY_ORDER.map((provider, index) => ({
    provider,
    modelId: LEGACY_MODELS[provider],
    priority: index,
    contextLength: 32768,
    capabilities: IMAGE_PROVIDERS.has(provider) ? ["text", "vision"] : ["text"],
  }));
}

const byPriority = (a, b) => (a.priority ?? 0) - (b.priority ?? 0);

/**
 * Lập danh sách các lần thử theo thứ tự:
 *  1. Provider người dùng chọn (đúng model đã chọn nếu model còn bật, nếu không lấy model ưu tiên nhất của provider đó).
 *  2. Các provider còn lại, sắp theo `priority` nhỏ nhất của model đang bật (admin chỉnh trong Admin → AI Model).
 * catalog = danh sách AIModel đang bật: { provider, modelId, priority, contextLength, capabilities }.
 */
export function buildAttempts({ preferredProvider, preferredModel, catalog = [], needsVision = false }) {
  const source = catalog.length ? catalog : legacyCatalog();
  const bestPriority = (name) => {
    const list = source.filter((m) => m.provider === name);
    return list.length ? Math.min(...list.map((m) => m.priority ?? 0)) : Infinity;
  };

  const others = Object.keys(providers)
    .filter((n) => n !== preferredProvider)
    .sort((a, b) => bestPriority(a) - bestPriority(b));
  const order = [preferredProvider, ...others];

  const attempts = [];
  const skipped = [];

  for (const name of order) {
    if (!providers[name]) {
      skipped.push(`${name}: nhà cung cấp không tồn tại`);
      continue;
    }
    if (!providers[name].isConfigured()) {
      skipped.push(`${name}: chưa cấu hình API key`);
      continue;
    }
    if (needsVision && !IMAGE_PROVIDERS.has(name)) {
      skipped.push(`${name}: không hỗ trợ phân tích ảnh`);
      continue;
    }

    let candidates = source.filter((m) => m.provider === name).sort(byPriority);
    if (needsVision) candidates = candidates.filter((m) => m.capabilities?.includes("vision"));
    if (!candidates.length) {
      skipped.push(`${name}: không có model phù hợp đang bật`);
      continue;
    }

    const chosen = (name === preferredProvider && candidates.find((m) => m.modelId === preferredModel)) || candidates[0];
    attempts.push({ providerName: name, model: chosen.modelId, contextLength: chosen.contextLength });
  }

  return { attempts, skipped };
}

export async function* streamWithFallback(messages, preferredProvider = "groq", model, { catalog = [] } = {}) {
  const lastMessage = messages[messages.length - 1];
  const needsVision = Boolean(lastMessage?.images?.length || lastMessage?.image);

  const { attempts, skipped } = buildAttempts({ preferredProvider, preferredModel: model, catalog, needsVision });
  const errors = [...skipped];
  let rateLimited = false;

  for (const attempt of attempts) {
    const { providerName, model: usedModel, contextLength } = attempt;

    if ((cooldownUntil[providerName] || 0) > Date.now()) {
      rateLimited = true;
      errors.push(`${providerName}: đang tạm nghỉ do giới hạn tốc độ`);
      continue;
    }

    const trimmed = trimMessagesToBudget(messages, computeInputBudget(contextLength));
    if (trimmed.dropped > 0) {
      console.log(`[AI Router] ${providerName}/${usedModel}: bỏ ${trimmed.dropped} tin cũ, còn ~${trimmed.estimatedTokens} token đầu vào.`);
    }

    let hasYielded = false;
    try {
      for await (const token of providers[providerName].streamChat(trimmed.messages, usedModel)) {
        hasYielded = true;
        yield { token, provider: providerName, model: usedModel };
      }
      if (hasYielded) return;
      errors.push(`${providerName}: không trả về dữ liệu`);
    } catch (err) {
      console.error(`[AI Router] Nhà cung cấp "${providerName}" gặp lỗi:`, err.message);
      // Đã gửi một phần câu trả lời cho client -> không chuyển provider khác (sẽ bị nối trùng nội dung).
      if (hasYielded) throw err;
      if (isRateLimitError(err)) {
        rateLimited = true;
        cooldownUntil[providerName] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
      errors.push(`${providerName}: ${err.message}`);
    }
  }

  const error = new Error(`Tất cả nhà cung cấp AI đều gặp lỗi hoặc chưa được cấu hình. Chi tiết: ${errors.join(" | ")}`);
  error.code = rateLimited ? AI_ERROR_CODES.RATE_LIMITED : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
  throw error;
}

export async function generateConversationTitle(text) {
  const fallbackTitle = text.length > 60 ? `${text.slice(0, 57)}...` : text;

  for (const name of TITLE_CHAIN) {
    const provider = providers[name];
    if (!provider || !provider.isConfigured()) continue;
    try {
      const title = await provider.generateTitle(text);
      if (title) return title.slice(0, 120);
    } catch (err) {
      console.error(`[AI Router] Không thể tạo tiêu đề bằng "${name}":`, err.message);
    }
  }

  return fallbackTitle;
}