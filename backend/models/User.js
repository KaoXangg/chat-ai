import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: { len: [3, 32] },
      set(value) {
        this.setDataValue("username", typeof value === "string" ? value.trim() : value);
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue("email", typeof value === "string" ? value.toLowerCase().trim() : value);
      },
    },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "user",
      validate: { isIn: [["user", "admin"]] },
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "active",
      validate: { isIn: [["active", "banned"]] },
    },
    avatar: { type: DataTypes.STRING(500), allowNull: true, defaultValue: "" },
    // Ngôn ngữ giao diện đã chọn (null = chưa chọn, dùng lựa chọn của trình duyệt).
    uiLanguage: { type: DataTypes.STRING(10), allowNull: true },
    // Ngôn ngữ AI trả lời: "auto" (theo tin nhắn của người dùng) hoặc một mã ngôn ngữ như "en", "ja".
    aiLanguage: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "auto" },
    // Virtual field de giu tuong thich voi frontend (dang dung `_id` kieu Mongo).
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "Users",
    timestamps: true,
  }
);

export default User;
