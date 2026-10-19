import "dotenv/config";
import { connectDB } from "./config/db.js";
import "./models/index.js";
import { encryptStoredApiKeys } from "./models/SystemSetting.js";
import { createApp } from "./app.js";

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  try {
    const migrated = await encryptStoredApiKeys();
    if (migrated) console.log(`[Server] Đã mã hóa ${migrated} API key đang lưu dạng thô trong DB.`);
  } catch (err) {
    console.warn("[Server] Không mã hóa được API key trong DB:", err?.message);
  }
  app.listen(PORT, () => {
    console.log(`[Server] Chat AI backend đang chạy tại http://localhost:${PORT}`);
  });
});