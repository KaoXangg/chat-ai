import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret, isEncryptedSecret } from "../utils/secretBox.js";

const TEST_KEY = crypto.randomBytes(32).toString("hex");

function withKey(fn) {
  return async () => {
    const previous = process.env.API_KEY_ENCRYPTION_KEY;
    process.env.API_KEY_ENCRYPTION_KEY = TEST_KEY;
    try {
      await fn();
    } finally {
      if (previous === undefined) delete process.env.API_KEY_ENCRYPTION_KEY;
      else process.env.API_KEY_ENCRYPTION_KEY = previous;
    }
  };
}

test("mã hóa rồi giải mã trả đúng giá trị gốc", withKey(() => {
  const stored = encryptSecret("  gsk_example_key_123  ", "groqApiKey");
  assert.ok(isEncryptedSecret(stored));
  assert.ok(!stored.includes("gsk_example_key_123"));
  assert.equal(decryptSecret(stored, "groqApiKey"), "gsk_example_key_123");
}));

test("mỗi lần mã hóa cho kết quả khác nhau (IV ngẫu nhiên)", withKey(() => {
  assert.notEqual(encryptSecret("abc", "groqApiKey"), encryptSecret("abc", "groqApiKey"));
}));

test("không giải mã được khi đổi sang trường khác hoặc bị sửa dữ liệu", withKey(() => {
  const stored = encryptSecret("secret-value", "groqApiKey");
  assert.equal(decryptSecret(stored, "geminiApiKey"), null);
  const tampered = stored.slice(0, -2) + (stored.endsWith("AA") ? "BB" : "AA");
  assert.equal(decryptSecret(tampered, "groqApiKey"), null);
}));

test("giá trị cũ chưa mã hóa được trả nguyên, giá trị rỗng trả null", withKey(() => {
  assert.equal(decryptSecret("legacy-plain-key", "groqApiKey"), "legacy-plain-key");
  assert.equal(decryptSecret(null, "groqApiKey"), null);
  assert.equal(encryptSecret("   ", "groqApiKey"), null);
  assert.equal(encryptSecret(undefined, "groqApiKey"), null);
}));

test("từ chối key quá dài và kiểu dữ liệu sai", withKey(() => {
  assert.throws(() => encryptSecret("x".repeat(151), "groqApiKey"), { code: "INVALID_INPUT" });
  assert.throws(() => encryptSecret(12345, "groqApiKey"), { code: "INVALID_INPUT" });
  assert.ok(encryptSecret("x".repeat(150), "groqApiKey").length <= 255);
}));

test("thiếu hoặc sai định dạng khóa thì không cho lưu", () => {
  const previous = process.env.API_KEY_ENCRYPTION_KEY;
  try {
    delete process.env.API_KEY_ENCRYPTION_KEY;
    assert.throws(() => encryptSecret("abc", "groqApiKey"), { code: "ENCRYPTION_NOT_CONFIGURED" });
    process.env.API_KEY_ENCRYPTION_KEY = "too-short";
    assert.throws(() => encryptSecret("abc", "groqApiKey"), { code: "ENCRYPTION_NOT_CONFIGURED" });
  } finally {
    if (previous === undefined) delete process.env.API_KEY_ENCRYPTION_KEY;
    else process.env.API_KEY_ENCRYPTION_KEY = previous;
  }
});

test("model SystemSetting lưu dạng mã hóa nhưng đọc ra plaintext", withKey(async () => {
  const { default: SystemSetting } = await import("../models/SystemSetting.js");
  const row = SystemSetting.build({ id: 1 });
  row.geminiApiKey = "AIza-example-key";
  assert.ok(isEncryptedSecret(row.getDataValue("geminiApiKey")));
  assert.equal(row.geminiApiKey, "AIza-example-key");
  assert.equal(row.toJSON().geminiApiKey, "AIza-example-key");
}));