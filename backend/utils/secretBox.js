import crypto from "node:crypto";

/**
 * Mã hóa AES-256-GCM cho dữ liệu bí mật lưu trong DB (API key...).
 * Định dạng lưu: "enc:v1:" + base64url(iv[12] | authTag[16] | ciphertext)
 * Khóa: biến môi trường API_KEY_ENCRYPTION_KEY = 64 ký tự hex (32 byte).
 * Tạo khóa: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const PREFIX = "enc:v1:";
const MAX_SECRET_LENGTH = 150; // đảm bảo bản mã hóa vừa cột NVARCHAR(255)
const warned = new Set();

function warnOnce(id, message) {
  if (warned.has(id)) return;
  warned.add(id);
  console.error(message);
}

function getKey() {
  const raw = process.env.API_KEY_ENCRYPTION_KEY || "";
  return /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : null;
}

export function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function isEncryptionConfigured() {
  return getKey() !== null;
}

/** Mã hóa một chuỗi bí mật. Trả về null nếu rỗng. `context` (tên trường) được gắn vào AAD. */
export function encryptSecret(plain, context = "") {
  if (plain === null || plain === undefined || plain === "") return null;
  if (typeof plain !== "string") {
    throw Object.assign(new Error("Giá trị bí mật không hợp lệ."), { status: 400, code: "INVALID_INPUT" });
  }
  const value = plain.trim();
  if (!value) return null;
  if (value.length > MAX_SECRET_LENGTH) {
    throw Object.assign(new Error(`API key quá dài (tối đa ${MAX_SECRET_LENGTH} ký tự).`), { status: 400, code: "INVALID_INPUT" });
  }
  const key = getKey();
  if (!key) {
    throw Object.assign(
      new Error("Chưa cấu hình API_KEY_ENCRYPTION_KEY (64 ký tự hex) nên không thể lưu API key."),
      { status: 500, code: "ENCRYPTION_NOT_CONFIGURED" }
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(String(context)));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

/**
 * Giải mã. Giá trị cũ chưa mã hóa (không có tiền tố) được trả nguyên để tương thích dữ liệu hiện có.
 * Lỗi giải mã (sai khóa, dữ liệu bị sửa) trả về null thay vì làm sập request.
 */
export function decryptSecret(stored, context = "") {
  if (stored === null || stored === undefined || stored === "") return null;
  if (!isEncryptedSecret(stored)) return stored;
  const key = getKey();
  if (!key) {
    warnOnce("nokey", "[SecretBox] Thiếu/không hợp lệ API_KEY_ENCRYPTION_KEY, không giải mã được API key trong DB.");
    return null;
  }
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64url");
    if (buf.length < 29) throw new Error("Dữ liệu mã hóa quá ngắn");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(String(context)));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    warnOnce(`fail:${context}`, `[SecretBox] Không giải mã được "${context}" (sai khóa hoặc dữ liệu bị thay đổi).`);
    return null;
  }
}