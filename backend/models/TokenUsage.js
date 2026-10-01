import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Sổ cái token: mỗi lần AI trả lời thành công ghi 1 dòng.
// Tách khỏi bảng Messages để xóa cuộc trò chuyện KHÔNG làm mất lượng token đã dùng (không "reset" hạn mức bằng cách xóa chat).
const TokenUsage = sequelize.define(
  "TokenUsage",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    provider: { type: DataTypes.STRING(50), allowNull: false },
    modelId: { type: DataTypes.STRING(150), allowNull: false },
    promptTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    completionTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // true = provider không trả số token thật, hệ thống tự ước lượng.
    estimated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "TokenUsages",
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ["userId", "createdAt"] }],
  }
);

export default TokenUsage;
