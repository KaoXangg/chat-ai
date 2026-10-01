// Cắt bớt lịch sử chat để vừa "ngân sách" token của model, tránh gửi thừa và tốn quota API free.

// Ước lượng thận trọng: tiếng Việt và code tốn nhiều token hơn tiếng Anh (~4 ký tự/token).
const CHARS_PER_TOKEN = 3;
const TOKENS_PER_IMAGE = 1000;
const MESSAGE_OVERHEAD = 8;
const DEFAULT_CONTEXT_LENGTH = 8192;
const MIN_BUDGET = 1000;

function imageCount(message) {
  if (message.images?.length) return message.images.length;
  return message.image ? 1 : 0;
}

export function estimateMessageTokens(message) {
  const textTokens = Math.ceil((message.content?.length || 0) / CHARS_PER_TOKEN);
  return textTokens + imageCount(message) * TOKENS_PER_IMAGE + MESSAGE_OVERHEAD;
}

/**
 * Ngân sách token đầu vào = min(70% độ dài ngữ cảnh của model, MAX_CONTEXT_TOKENS trong .env).
 * 30% còn lại chừa cho câu trả lời; MAX_CONTEXT_TOKENS giúp tiết kiệm quota/TPM của gói free.
 */
export function computeInputBudget(contextLength) {
  const limit = Number(contextLength) > 0 ? Number(contextLength) : DEFAULT_CONTEXT_LENGTH;
  const cap = Number(process.env.MAX_CONTEXT_TOKENS) || 12000;
  return Math.max(MIN_BUDGET, Math.min(Math.floor(limit * 0.7), cap));
}

/**
 * - Luôn giữ system prompt và tin nhắn mới nhất.
 * - Giữ thêm các tin cũ từ mới đến cũ cho tới khi hết ngân sách.
 * - Chỉ giữ ảnh của tin gần nhất có ảnh (ảnh base64 rất nặng).
 * - Lịch sử luôn bắt đầu bằng tin của user (Gemini yêu cầu).
 */
export function trimMessagesToBudget(messages, budget) {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  let lastImageIndex = -1;
  rest.forEach((m, i) => {
    if (imageCount(m) > 0) lastImageIndex = i;
  });
  const prepared = rest.map((m, i) =>
    imageCount(m) > 0 && i !== lastImageIndex ? { ...m, images: undefined, image: undefined } : m
  );

  let used = system.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  const kept = [];
  for (let i = prepared.length - 1; i >= 0; i--) {
    const cost = estimateMessageTokens(prepared[i]);
    if (kept.length > 0 && used + cost > budget) break;
    kept.unshift(prepared[i]);
    used += cost;
  }
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();

  return { messages: [...system, ...kept], dropped: prepared.length - kept.length, estimatedTokens: used };
}
