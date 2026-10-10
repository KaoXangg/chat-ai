import { invalidInput } from "./validation.js";

const fields = new Set(["provider", "modelId", "displayName", "description", "capabilities", "contextLength", "dailyTokenLimit", "enabled", "isDefault", "priority"]);
const capabilities = new Set(["text", "coding", "reasoning", "vision"]);

export function sanitizeModelPayload(body, { creating = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw invalidInput();
  const payload = Object.fromEntries(Object.entries(body).filter(([key]) => fields.has(key)));
  for (const [key, max] of [["provider", 50], ["modelId", 150], ["displayName", 150], ["description", 500]]) {
    if (payload[key] === undefined) {
      if (creating && key !== "description") throw invalidInput(`Thiếu ${key}.`);
      continue;
    }
    if (typeof payload[key] !== "string" || payload[key].length > max || (key !== "description" && !payload[key].trim())) throw invalidInput(`${key} không hợp lệ.`);
    payload[key] = payload[key].trim();
  }
  if (payload.provider !== undefined && !["groq", "gemini", "openrouter"].includes(payload.provider)) throw invalidInput("Nhà cung cấp không hợp lệ.");
  for (const [key, min] of [["contextLength", 1], ["dailyTokenLimit", 0], ["priority", -2147483648]]) {
    if (payload[key] !== undefined && (typeof payload[key] !== "number" || !Number.isInteger(payload[key]) || payload[key] < min || payload[key] > 2147483647)) throw invalidInput(`${key} phải là số nguyên trong phạm vi cho phép.`);
  }
  for (const key of ["enabled", "isDefault"]) {
    if (payload[key] !== undefined && typeof payload[key] !== "boolean") throw invalidInput(`${key} phải là true hoặc false.`);
  }
  if (payload.capabilities !== undefined) {
    if (!Array.isArray(payload.capabilities) || !payload.capabilities.length || payload.capabilities.some(value => !capabilities.has(value))) throw invalidInput("Khả năng của mô hình không hợp lệ.");
    payload.capabilities = [...new Set(payload.capabilities)];
  }
  return payload;
}
