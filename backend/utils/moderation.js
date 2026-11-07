import { getSystemSettings } from "../models/SystemSetting.js";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tìm từ khóa bị chặn trong nội dung tin nhắn theo ranh giới từ Unicode (tránh bắt nhầm từ ghép - Scunthorpe problem).
 * @param {string} content
 * @param {string} blockedKeywordsRaw
 * @returns {string|null} Từ khóa vi phạm đầu tiên tìm thấy, hoặc null nếu hợp lệ.
 */
export function findBlockedKeyword(content, blockedKeywordsRaw) {
  if (typeof content !== "string" || !content.trim()) return null;
  if (typeof blockedKeywordsRaw !== "string" || !blockedKeywordsRaw.trim()) return null;

  const keywords = blockedKeywordsRaw
    .split(/[,\n]/)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 1);

  if (!keywords.length) return null;

  for (const kw of keywords) {
    const escaped = escapeRegExp(kw);
    // Ranh giới từ hỗ trợ đầy đủ tiếng Việt và Unicode
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu");
    if (pattern.test(content)) {
      return kw;
    }
  }
  return null;
}

/**
 * Kiểm tra nội dung tin nhắn với danh sách từ khóa cấm trong SystemSettings.
 * Trả về từ khóa vi phạm (hoặc null nếu an toàn).
 */
export async function checkContentViolation(content) {
  const settings = await getSystemSettings();
  if (!settings?.blockedKeywords) return null;
  return findBlockedKeyword(content, settings.blockedKeywords);
}

