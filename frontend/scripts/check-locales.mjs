import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeRoot = path.join(frontendRoot, "src", "i18n", "locales");
const locales = ["vi", "en", "es", "ja", "zh-CN"];
const entries = new Map();
const errors = [];
const warnings = [];
const quotedString = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;

function add(file, line, key, message) {
  errors.push(`${path.relative(frontendRoot, file).replaceAll("\\", "/")}:${line}:${key || "?"}: ${message}`);
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const localeFiles = await walk(localeRoot);
for (const file of localeFiles) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(await readFile(file));
  } catch {
    add(file, 1, "?", "invalid UTF-8");
    continue;
  }
  if (source.charCodeAt(0) === 0xfeff) add(file, 1, "?", "UTF-8 BOM is not allowed");
  if (source.includes("\ufffd")) add(file, 1, "?", "replacement character U+FFFD found");

  const locale = path.relative(localeRoot, file).split(path.sep)[0];
  if (!entries.has(locale)) entries.set(locale, new Map());
  const values = entries.get(locale);
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const keyMatch = line.match(/^\s*(["'])([^"']+)\1\s*:/);
    if (!keyMatch) continue;
    const key = keyMatch[2];
    const valueMatch = line.slice(keyMatch[0].length).match(/^\s*(["'`])((?:\\.|(?!\1)[^\\])*?)\1/);
    if (!valueMatch) continue;
    const value = valueMatch[2];
    values.set(key, { value, file, line: index + 1 });
    if (!value.includes("http") && !value.includes("${") && !/\?[^\s"'`=]+=/.test(value) && /\?\w|\?{2,}/u.test(value)) {
      add(file, index + 1, key, "suspicious question mark in translation string");
    }
  }
}

const english = entries.get("en") ?? new Map();
const placeholderPattern = /\{[^{}]*\}|<\/?b>/g;
function tokens(value) {
  return [...value.matchAll(placeholderPattern)].map((match) => match[0]).sort();
}
for (const locale of locales) {
  if (locale === "en") continue;
  const translated = entries.get(locale) ?? new Map();
  for (const [key, base] of english) {
    const current = translated.get(key);
    if (!current) {
      const message = `missing key from en (${locale})`;
      const result = `${locale}/${path.basename(base.file)}:${base.line}:${key}: ${message}`;
      if (key.startsWith("admin.") && locale !== "vi") warnings.push(result);
      else errors.push(result);
      continue;
    }
    if (JSON.stringify(tokens(base.value)) !== JSON.stringify(tokens(current.value))) {
      add(current.file, current.line, key, `placeholder or bold-tag mismatch with en`);
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
if (errors.length) process.exitCode = 1;
else console.log(`Locale check passed (${localeFiles.length} files, 0 errors).`);
