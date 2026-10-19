import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    sessionToken: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    refreshTokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    deviceType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "desktop",
    },
    os: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    rememberMe: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "Sessions",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["sessionToken"], unique: true },
      { fields: ["refreshTokenHash"] },
    ],
  }
);

export default Session;
