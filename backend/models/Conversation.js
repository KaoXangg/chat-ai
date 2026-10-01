import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Conversation = sequelize.define(
  "Conversation",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: "Cuộc trò chuyện mới",
      set(value) {
        this.setDataValue("title", typeof value === "string" ? value.trim() : value);
      },
    },
    provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "openrouter" },
    model: { type: DataTypes.STRING(150), allowNull: false, defaultValue: "openrouter/free" },
    pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "Conversations",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  }
);

export default Conversation;
