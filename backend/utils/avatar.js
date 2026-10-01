import crypto from "crypto";

/**
 * Avatar hoạt hình ngẫu nhiên qua DiceBear (CDN miễn phí, không cần API key).
 * Dùng seed tên con vật + style cartoon để mỗi lần ra "con" khác nhau.
 * Docs: https://www.dicebear.com/styles/
 */

// Style cartoon dễ thương, ổn định trên DiceBear 9.x
const STYLES = [
  "bottts",       // robot cute
  "fun-emoji",    // mặt emoji vui
  "adventurer",   // nhân vật phiêu lưu
  "lorelei",      // minh họa
  "notionists",   // kiểu Notion
  "croodles",     // doodle
  "pixel-art",    // pixel
  "thumbs",       // ngón tay cute
  "big-smile",    // mặt cười to
  "avataaars",    // avatar cartoon
];

// Seed theo "con này con nọ" — mỗi seed + style = một khuôn mặt khác
const ANIMAL_SEEDS = [
  "cat", "dog", "fox", "panda", "rabbit", "bear", "owl", "penguin",
  "tiger", "lion", "koala", "unicorn", "dragon", "hamster", "otter",
  "raccoon", "sloth", "hedgehog", "bunny", "kitty", "puppy", "chick",
  "duck", "frog", "monkey", "elephant", "giraffe", "zebra", "whale",
  "dolphin", "seal", "squirrel", "mouse", "piggy", "sheep", "cow",
  "horse", "deer", "wolf", "eagle", "parrot", "flamingo", "turtle",
  "crab", "bee", "butterfly", "dino", "axolotl", "capybara", "shiba",
];

// Nền pastel nhẹ để avatar tròn trông gọn trên UI
const BACKGROUNDS = [
  "b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf",
  "c7f0d8", "fde68a", "fecaca", "a5f3fc", "ddd6fe",
];

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

/** Tạo URL avatar hoạt hình ngẫu nhiên (lưu vào Users.avatar). */
export function generateRandomAvatar() {
  const style = STYLES[crypto.randomInt(STYLES.length)];
  const animal = ANIMAL_SEEDS[crypto.randomInt(ANIMAL_SEEDS.length)];
  const salt = crypto.randomBytes(3).toString("hex");
  const seed = encodeURIComponent(`${animal}-${salt}`);
  const bg = BACKGROUNDS[crypto.randomInt(BACKGROUNDS.length)];

  // size=128 đủ nét cho avatar 32–64px; format svg nhẹ, scale mượt
  return `${DICEBEAR_BASE}/${style}/svg?seed=${seed}&backgroundColor=${bg}&radius=50`;
}

/** Kiểm tra URL avatar có phải do hệ thống tạo (DiceBear) không. */
export function isValidAvatarUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "api.dicebear.com" && u.pathname.includes("/svg");
  } catch {
    return false;
  }
}