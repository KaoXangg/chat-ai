// Tạo tài khoản quản trị mặc định và thêm danh sách mô hình AI.
// Chạy bằng lệnh: npm run seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB, sequelize } from "./config/db.js";
import "./models/index.js";
import User from "./models/User.js";
import AIModel from "./models/AIModel.js";
import { generateRandomAvatar } from "./utils/avatar.js";

const DEFAULT_MODELS = [
  {
    provider: "groq",
    modelId: "openai/gpt-oss-120b",
    displayName: "GPT OSS 120B (Groq)",
    description: "Mô hình Groq thuộc hạn mức Free hiện tại.",
    capabilities: ["text", "coding", "reasoning"],
    contextLength: 131072,
    enabled: true,
    isDefault: false,
    priority: 3,
  },
  {
    provider: "groq",
    modelId: "openai/gpt-oss-20b",
    displayName: "GPT OSS 20B (Groq)",
    description: "Mô hình Groq thuộc hạn mức Free hiện tại.",
    capabilities: ["text"],
    contextLength: 131072,
    enabled: true,
    isDefault: false,
    priority: 4,
  },
  {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Mô hình Google cân bằng giữa tốc độ và chất lượng.",
    capabilities: ["text", "reasoning", "vision"],
    contextLength: 1000000,
    enabled: true,
    isDefault: false,
    priority: 1,
  },
  {
    provider: "openrouter",
    modelId: "openrouter/free",
    displayName: "OpenRouter Free",
    description: "Tự động chọn một mô hình miễn phí đang khả dụng trên OpenRouter.",
    capabilities: ["text"],
    contextLength: 32768,
    enabled: true,
    isDefault: true,
    priority: 0,
  },
];

const RETIRED_MODELS = [
  { provider: "groq", modelId: "llama-3.3-70b-versatile" },
  { provider: "groq", modelId: "llama-3.1-8b-instant" },
  { provider: "openrouter", modelId: "meta-llama/llama-3.1-8b-instruct:free" },
  { provider: "openrouter", modelId: "deepseek/deepseek-chat:free" },
];

async function seed() {
  await connectDB();

  // 1. Tạo tài khoản quản trị mặc định nếu chưa tồn tại.
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@chatai.local").toLowerCase();
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123456", 10);
    await User.create({
      username: process.env.ADMIN_USERNAME || "admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
      status: "active",
      avatar: generateRandomAvatar(),
    });
    console.log(`[Seed] Đã tạo quản trị viên: ${adminEmail} / mật khẩu trong .env (ADMIN_PASSWORD)`);
  } else {
    console.log(`[Seed] Admin "${adminEmail}" da ton tai, bo qua`);
  }

  // 2. Thêm mô hình mới, không ghi đè mô hình đã chỉnh sửa.
  for (const modelData of DEFAULT_MODELS) {
    const exists = await AIModel.findOne({ where: { provider: modelData.provider, modelId: modelData.modelId } });
    if (!exists) {
      await AIModel.create(modelData);
      console.log(`[Seed] Đã thêm mô hình: ${modelData.displayName}`);
    }
  }

  // Re-enable Groq models included in the current Free plan for existing databases.
  await AIModel.update(
    { enabled: true },
    { where: { provider: "groq", modelId: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] } },
  );

  // Hide retired IDs so users do not keep selecting models that now return 404.
  for (const where of RETIRED_MODELS) {
    await AIModel.update({ enabled: false, isDefault: false }, { where });
  }

  console.log("[Seed] Hoàn tất!");
  await sequelize.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Lỗi:", err);
  process.exit(1);
});