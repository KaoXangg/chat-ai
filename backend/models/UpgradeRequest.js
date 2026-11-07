import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const UpgradeRequest = sequelize.define(
  "UpgradeRequest",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    currentTier: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "free" },
    requestedTier: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [["free", "plus", "premium", "pro", "vip"]] },
    },
    billingCycle: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "monthly",
      validate: { isIn: [["monthly", "yearly"]] },
    },
    amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      validate: { isIn: [["pending", "approved", "rejected", "cancelled"]] },
    },
    adminNote: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
    reviewedBy: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    reviewedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "UpgradeRequests",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["status", "createdAt"] },
    ],
  }
);

export default UpgradeRequest;

