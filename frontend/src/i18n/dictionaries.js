/**
 * Tự động nạp mọi tệp ./locales/<mã-ngôn-ngữ>/*.js (mỗi tệp export default một object { "khóa": "chuỗi" }).
 * Thêm ngôn ngữ giao diện mới = tạo thư mục locales/<mã>/ và copy các tệp từ locales/en/ rồi dịch.
 * Khóa nào thiếu sẽ tự rơi về tiếng Anh (rồi tiếng Việt), nên có thể dịch dần từng phần.
 */
const modules = import.meta.glob("./locales/*/*.js", { eager: true });

export const dictionaries = {};

for (const [path, mod] of Object.entries(modules)) {
  const lang = path.split("/")[2];
  dictionaries[lang] = { ...(dictionaries[lang] || {}), ...mod.default };
}

/** Các ngôn ngữ giao diện có từ điển. */
export const UI_CODES = new Set(Object.keys(dictionaries));