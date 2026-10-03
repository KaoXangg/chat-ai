/**
 * Danh sách ngôn ngữ: [mã, tên tiếng Anh, tên bản ngữ].
 * PHẢI khớp với backend/utils/languages.js (mã dùng chung giữa hai phía).
 * - Ngôn ngữ AI trả lời: chọn được TẤT CẢ ngôn ngữ trong danh sách này.
 * - Ngôn ngữ giao diện: chỉ những ngôn ngữ có thư mục từ điển trong ./locales/<mã>/ (xem dictionaries.js).
 */
const RAW = [
  ["vi", "Vietnamese", "Tiếng Việt"],
  ["en", "English", "English"],
  ["zh-CN", "Chinese (Simplified)", "简体中文"],
  ["zh-TW", "Chinese (Traditional)", "繁體中文"],
  ["ja", "Japanese", "日本語"],
  ["ko", "Korean", "한국어"],
  ["es", "Spanish", "Español"],
  ["fr", "French", "Français"],
  ["de", "German", "Deutsch"],
  ["pt", "Portuguese", "Português"],
  ["ru", "Russian", "Русский"],
  ["ar", "Arabic", "العربية"],
  ["hi", "Hindi", "हिन्दी"],
  ["bn", "Bengali", "বাংলা"],
  ["id", "Indonesian", "Bahasa Indonesia"],
  ["ms", "Malay", "Bahasa Melayu"],
  ["th", "Thai", "ไทย"],
  ["tl", "Filipino", "Filipino"],
  ["it", "Italian", "Italiano"],
  ["nl", "Dutch", "Nederlands"],
  ["pl", "Polish", "Polski"],
  ["tr", "Turkish", "Türkçe"],
  ["uk", "Ukrainian", "Українська"],
  ["cs", "Czech", "Čeština"],
  ["sv", "Swedish", "Svenska"],
  ["da", "Danish", "Dansk"],
  ["no", "Norwegian", "Norsk"],
  ["fi", "Finnish", "Suomi"],
  ["el", "Greek", "Ελληνικά"],
  ["he", "Hebrew", "עברית"],
  ["fa", "Persian", "فارسی"],
  ["ur", "Urdu", "اردو"],
  ["ta", "Tamil", "தமிழ்"],
  ["te", "Telugu", "తెలుగు"],
  ["mr", "Marathi", "मराठी"],
  ["ro", "Romanian", "Română"],
  ["hu", "Hungarian", "Magyar"],
  ["bg", "Bulgarian", "Български"],
  ["sr", "Serbian", "Српски"],
  ["hr", "Croatian", "Hrvatski"],
  ["sk", "Slovak", "Slovenčina"],
  ["sl", "Slovenian", "Slovenščina"],
  ["lt", "Lithuanian", "Lietuvių"],
  ["lv", "Latvian", "Latviešu"],
  ["et", "Estonian", "Eesti"],
  ["ca", "Catalan", "Català"],
  ["is", "Icelandic", "Íslenska"],
  ["af", "Afrikaans", "Afrikaans"],
  ["sw", "Swahili", "Kiswahili"],
  ["am", "Amharic", "አማርኛ"],
  ["km", "Khmer", "ខ្មែរ"],
  ["lo", "Lao", "ລາວ"],
  ["my", "Burmese", "မြန်မာ"],
  ["ne", "Nepali", "नेपाली"],
  ["si", "Sinhala", "සිංහල"],
  ["ka", "Georgian", "ქართული"],
  ["hy", "Armenian", "Հայերեն"],
  ["kk", "Kazakh", "Қазақша"],
  ["uz", "Uzbek", "Oʻzbekcha"],
  ["mn", "Mongolian", "Монгол"],
];

export const DEFAULT_LANG = "vi";
export const AI_AUTO = "auto";

const RTL_CODES = new Set(["ar", "he", "fa", "ur"]);

export const LANGUAGES = RAW.map(([code, name, native]) => ({ code, name, native, rtl: RTL_CODES.has(code) }));
export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]));

export function isRtl(code) {
  return RTL_CODES.has(code);
}