import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 1433,
    dialect: "mssql",
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== "false",
      },
    },
    logging: process.env.NODE_ENV === "production" ? false : console.log,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { freezeTableName: true },
  }
);

export async function connectDB() {
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_HOST) {
    console.error("[DB] Thiếu cấu hình SQL Server (DB_HOST/DB_NAME/DB_USER) trong tệp .env.");
    process.exit(1);
  }
  try {
    await sequelize.authenticate();
    console.log("[DB] Kết nối SQL Server thành công.");

    // Create missing tables, but do not alter existing SQL Server tables at startup.
    // Sequelize's MSSQL alter path can generate invalid `ALTER COLUMN ... UNIQUE` SQL.
    // Apply schema changes with backend/sql/schema.sql or a migration instead.
    await sequelize.sync();
    console.log("[DB] Đồng bộ cấu trúc cơ sở dữ liệu thành công.");
  } catch (err) {
    console.error("[DB] Lỗi kết nối SQL Server:", err.message);
    process.exit(1);
  }
}
