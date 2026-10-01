import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Danh sách mô hình AI mà quản trị viên có thể bật/tắt trong bảng điều khiển.
// Không lưu API key ở đây. Key nằm trong biến môi trường (.env);
// bảng này chỉ lưu thông tin hiển thị và trạng thái của từng mô hình.
const AIModel = sequelize.define(
  "AIModel",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    provider: { type: DataTypes.STRING(50), allowNull: false }, // "groq" | "gemini" | "openrouter"
    modelId: { type: DataTypes.STRING(150), allowNull: false }, // ten model thuc te goi API
    displayName: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true, defaultValue: "" },
    // SQL Server không có kiểu mảng; lưu dưới dạng chuỗi JSON và xử lý qua getter/setter.
    capabilities: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify(["text"]),
      get() {
        const raw = this.getDataValue("capabilities");
        if (!raw) return ["text"];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : ["text"];
        } catch {
          return ["text"];
        }
      },
      set(value) {
        const arr = Array.isArray(value) ? value : ["text"];
        this.setDataValue("capabilities", JSON.stringify(arr));
      },
    },
    contextLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8192 },
    // Hạn mức token mỗi người dùng được dùng với model này trong 1 ngày. 0 = không giới hạn.
    dailyTokenLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // uu tien fallback, so nho hon = uu tien hon
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "AIModels",
    timestamps: true,
  }
);

export default AIModel;
