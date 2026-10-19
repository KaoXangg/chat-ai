import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Folder = sequelize.define(
  "Folder",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) {
        this.setDataValue("name", typeof value === "string" ? value.trim() : value);
      },
    },
    color: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "#6366f1" },
    icon: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "Folder" },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id !== undefined && id !== null ? String(id) : undefined;
      },
    },
  },
  {
    tableName: "Folders",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  }
);

export default Folder;
