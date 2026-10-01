/**
 * Chuẩn hóa cú pháp công thức toán trong câu trả lời của AI trước khi đưa vào react-markdown + remark-math.
 *
 * 1. Đổi \( ... \) -> $...$ và \[ ... \] -> $$...$$ (nhiều model dùng kiểu này, remark-math không hiểu),
 *    đồng thời tách `$$...$$` nằm trọn một dòng thành khối để hiển thị căn giữa.
 * 2. Giữ nguyên công thức hợp lệ, còn các ký tự `$` lẻ (ví dụ "giá $5 và $10") được escape để không bị
 *    coi là công thức. Quy tắc giống Pandoc: `$` mở không đứng trước khoảng trắng, `$` đóng không đứng
 *    sau khoảng trắng và không theo sau bởi chữ số.
 * 3. Không đụng vào khối mã ``` ``` và mã inline `...` (kể cả khối mã chưa đóng khi đang stream).
 */

const CODE_SPLIT = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`)/g;
const DISPLAY_BRACKET = /\\\[([\s\S]+?)\\\]/g;
const INLINE_PAREN = /\\\(([\s\S]+?)\\\)/g;
const DISPLAY_DOLLAR = /\$\$[\s\S]+?\$\$/g;
// `$$...$$` nằm trọn một dòng -> tách thành khối ($$ riêng dòng) để được render dạng display.
const SINGLE_LINE_DISPLAY = /^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm;
const INLINE_DOLLAR = /(?<![\\$])\$(?![\s$])(?:\\.|[^$\\\n])+?(?<![\s\\])\$(?![\d$])/g;
const LONE_DOLLAR = /(?<!\\)\$/g;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

function transformPlainText(text) {
  if (!text.includes("$") && !text.includes("\\[") && !text.includes("\\(")) return text;

  let out = text
    .replace(DISPLAY_BRACKET, (_, math) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replace(INLINE_PAREN, (_, math) => `$${math.trim()}$`)
    .replace(SINGLE_LINE_DISPLAY, (_, indent, math) => `${indent}$$\n${indent}${math.trim()}\n${indent}$$`);

  const stash = [];
  const protect = (match) => {
    stash.push(match);
    return `\u0000${stash.length - 1}\u0000`;
  };

  out = out.replace(DISPLAY_DOLLAR, protect).replace(INLINE_DOLLAR, protect);
  out = out.replace(LONE_DOLLAR, () => "\\$");
  return out.replace(PLACEHOLDER, (_, index) => stash[Number(index)]);
}

export function preprocessMath(content) {
  if (!content) return content;
  return content
    .split(CODE_SPLIT)
    .map((segment, index) => (index % 2 === 1 ? segment : transformPlainText(segment)))
    .join("");
}