import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PasswordReset = sequelize.define(
  "PasswordReset",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    otpHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "PasswordResets",
    timestamps: true,
  }
);

export default PasswordReset;