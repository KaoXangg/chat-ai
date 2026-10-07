import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Message = sequelize.define(
  "Message",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER, allowNull: false },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [["user", "assistant"]] },
    },
    content: { type: DataTypes.TEXT("long"), allowNull: false },
    provider: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
    model: { type: DataTypes.STRING(150), allowNull: true, defaultValue: null },
    imageBase64: { type: DataTypes.TEXT("long"), allowNull: true, defaultValue: null },
    imageMimeType: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
    images: {
      // JSON-encoded array of { mimeType, data } for multi-image messages (ChatGPT-style).
      // Additive column: legacy single-image columns above are still populated (first image)
      // for any code that only reads imageBase64/imageMimeType.
      type: DataTypes.TEXT("long"),
      allowNull: true,
      defaultValue: null,
      get() {
        const raw = this.getDataValue("images");
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
      set(value) {
        this.setDataValue("images", Array.isArray(value) && value.length ? JSON.stringify(value) : null);
      },
    },
    sources: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      defaultValue: null,
      get() {
        const raw = this.getDataValue("sources");
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
      set(value) {
        this.setDataValue("sources", value ? JSON.stringify(value) : null);
      },
    },
    feedback: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: null,
      validate: {
        isValidFeedback(value) {
          if (value !== null && value !== "like" && value !== "dislike") {
            throw new Error("feedback phai la null, 'like' hoac 'dislike'");
          }
        },
      },
    },
    isError: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    interrupted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "Messages",
    timestamps: true,
    indexes: [{ fields: ["conversationId"] }],
  }
);

export default Message;
