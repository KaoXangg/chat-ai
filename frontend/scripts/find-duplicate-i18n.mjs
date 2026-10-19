import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Dùng: node scripts/find-duplicate-i18n.mjs [thư-mục-locales]
// Mặc định: src/i18n/locales
const root = path.resolve(process.argv[2] || "src/i18n/locales");

if (!fs.existsSync(root)) {
  console.error(`Không tìm thấy thư mục: ${root}`);
  process.exit(2);
}

const langs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
let total = 0;

for (const lang of langs) {
  const seen = new Map();
  const files = fs.readdirSync(path.join(root, lang)).filter((f) => f.endsWith(".js")).sort();
  for (const file of files) {
    const entries = (await import(pathToFileURL(path.join(root, lang, file)).href)).default;
    for (const [key, value] of Object.entries(entries)) {
      if (seen.has(key)) {
        const first = seen.get(key);
        const same = first.value === value ? "giá trị GIỐNG nhau" : "giá trị KHÁC nhau";
        console.log(`[${lang}] "${key}" trùng giữa ${first.file} và ${file} (${same})`);
        if (first.value !== value) console.log(`    ${first.file}: ${JSON.stringify(first.value)}\n    ${file}: ${JSON.stringify(value)}`);
        total++;
      } else {
        seen.set(key, { file, value });
      }
    }
  }
}

console.log(total ? `\nTổng: ${total} key trùng.` : "Không có key trùng.");
process.exit(total ? 1 : 0);