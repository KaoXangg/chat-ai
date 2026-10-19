import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { encryptSecret, decryptSecret, isEncryptedSecret } from "../utils/secretBox.js";

const API_KEY_FIELDS = ["geminiApiKey", "groqApiKey", "openrouterApiKey", "tavilyApiKey"];

// API key được mã hóa AES-256-GCM khi ghi vào DB và tự giải mã khi đọc qua model.
function encryptedKeyField(name) {
  return {
    type: DataTypes.STRING(255),
    allowNull: true,
    get() {
      return decryptSecret(this.getDataValue(name), name);
    },
    set(value) {
      this.setDataValue(name, encryptSecret(value, name));
    },
  };
}

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
    allowRegistration: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maintenanceMode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    maintenanceMessage: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: "Hệ thống đang bảo trì để nâng cấp tính năng. Vui lòng quay lại sau ít phút.",
    },
    globalSystemPrompt: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    defaultUserDailyTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50000 },
    rateLimitPerMinute: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    // Dynamic API Keys (lưu dạng mã hóa; nếu admin nhập sẽ ưu tiên hơn file .env)
    geminiApiKey: encryptedKeyField("geminiApiKey"),
    groqApiKey: encryptedKeyField("groqApiKey"),
    openrouterApiKey: encryptedKeyField("openrouterApiKey"),
    tavilyApiKey: encryptedKeyField("tavilyApiKey"),
    // Bộ lọc từ khóa nhạy cảm / Blacklist (danh sách phân tách bởi dấu phẩy)
    blockedKeywords: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
  },
  {
    tableName: "SystemSettings",
    timestamps: true,
  }
);

let cachedSettings = null;
let lastFetch = 0;
const CACHE_TTL = 10_000; // 10 giây

export async function getSystemSettings() {
  const now = Date.now();
  if (cachedSettings && now - lastFetch < CACHE_TTL) {
    return cachedSettings;
  }
  try {
    let settings = await SystemSetting.findByPk(1);
    if (!settings) {
      settings = await SystemSetting.create({ id: 1 });
    }
    cachedSettings = settings.toJSON();
    lastFetch = now;
    return cachedSettings;
  } catch (err) {
    console.warn("[SystemSettings] Lỗi đọc cài đặt hệ thống, dùng mặc định:", err?.message);
    return {
      allowRegistration: true,
      maintenanceMode: false,
      maintenanceMessage: "Hệ thống đang bảo trì.",
      globalSystemPrompt: "",
      defaultUserDailyTokens: 50000,
      rateLimitPerMinute: 30,
    };
  }
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}

/**
 * Mã hóa các API key đang lưu dạng thô trong DB (chạy khi khởi động, idempotent).
 * Trả về số trường đã được mã hóa.
 */
export async function encryptStoredApiKeys() {
  const row = await SystemSetting.findByPk(1);
  if (!row) return 0;
  let changed = 0;
  for (const field of API_KEY_FIELDS) {
    const stored = row.getDataValue(field);
    if (stored && !isEncryptedSecret(stored)) {
      row.set(field, stored); // setter sẽ mã hóa
      changed++;
    }
  }
  if (changed) {
    await row.save();
    invalidateSettingsCache();
  }
  return changed;
}

export default SystemSetting;