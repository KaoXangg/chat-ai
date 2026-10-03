/**
 * Danh sách ngôn ngữ được hỗ trợ: [mã, tên tiếng Anh, tên bản ngữ].
 * PHẢI khớp với frontend/src/i18n/languages.js (mã dùng chung giữa hai phía).
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

export const LANGUAGES = RAW.map(([code, name, native]) => ({ code, name, native }));
const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export const AI_LANGUAGE_AUTO = "auto";

export function isValidLanguage(code) {
  return typeof code === "string" && BY_CODE.has(code);
}

export function isValidAiLanguage(code) {
  return code === AI_LANGUAGE_AUTO || isValidLanguage(code);
}

/**
 * Câu chỉ dẫn thêm vào system prompt theo ngôn ngữ trả lời người dùng chọn.
 * "auto" (hoặc mã không hợp lệ) => không thêm gì, AI tự trả lời theo ngôn ngữ của tin nhắn.
 */
export function aiLanguageDirective(code) {
  const lang = BY_CODE.get(code);
  if (!lang) return "";
  return (
    `Language preference: always write your replies in ${lang.name} (${lang.native}), regardless of the language the user writes in, ` +
    "unless the user explicitly asks for a different language. Keep source code, identifiers, commands and proper nouns unchanged."
  );
}