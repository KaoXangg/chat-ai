import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adminId: { type: DataTypes.INTEGER, allowNull: true },
    adminUsername: { type: DataTypes.STRING(100), allowNull: true },
    action: { type: DataTypes.STRING(50), allowNull: false },
    targetType: { type: DataTypes.STRING(50), allowNull: true },
    targetId: { type: DataTypes.STRING(100), allowNull: true },
    details: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(100), allowNull: true },
  },
  {
    tableName: "AuditLogs",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["createdAt"] },
      { fields: ["action"] },
      { fields: ["adminId"] },
    ],
  }
);

export async function createAuditLog({
  adminId = null,
  adminUsername = "Hệ thống",
  action,
  targetType = null,
  targetId = null,
  details = null,
  ipAddress = null,
}) {
  try {
    const formattedDetails =
      typeof details === "object" && details !== null
        ? JSON.stringify(details)
        : details;
    return await AuditLog.create({
      adminId,
      adminUsername,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details: formattedDetails,
      ipAddress,
    });
  } catch (err) {
    console.error("[AuditLog] Không thể ghi log:", err?.message);
    return null;
  }
}

export default AuditLog;
