import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Persona = sequelize.define(
  "Persona",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true }, // null nếu là preset hệ thống
    name: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    systemPrompt: { type: DataTypes.TEXT, allowNull: false },
    avatar: { type: DataTypes.STRING(255), allowNull: true, defaultValue: "🤖" },
    category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "general" },
    suggestedPrompts: { type: DataTypes.TEXT, allowNull: true },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "Personas",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  }
);

export default Persona;
