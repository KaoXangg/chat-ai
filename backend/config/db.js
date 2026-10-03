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

/**
 * Thêm các cột mới vào bảng đã có (sync() không tự thêm cột). An toàn khi chạy lại nhiều lần.
 * - AIModels.dailyTokenLimit: hạn mức token/ngày cho mỗi người dùng (0 = không giới hạn).
 * - Users.uiLanguage / Users.aiLanguage: ngôn ngữ giao diện và ngôn ngữ AI trả lời.
 */
async function ensureSchemaUpdates() {
  await sequelize.query(`
    IF OBJECT_ID('dbo.AIModels', 'U') IS NOT NULL AND COL_LENGTH('dbo.AIModels', 'dailyTokenLimit') IS NULL
    BEGIN
      ALTER TABLE dbo.AIModels ADD dailyTokenLimit INT NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0);
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'uiLanguage') IS NULL
    BEGIN
      ALTER TABLE dbo.Users ADD uiLanguage NVARCHAR(10) NULL;
    END
  `);
  await sequelize.query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'aiLanguage') IS NULL
    BEGIN
      ALTER TABLE dbo.Users ADD aiLanguage NVARCHAR(10) NOT NULL CONSTRAINT DF_Users_aiLanguage DEFAULT ('auto');
    END
  `);
}

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
    await ensureSchemaUpdates();
    console.log("[DB] Đồng bộ cấu trúc cơ sở dữ liệu thành công.");
  } catch (err) {
    console.error("[DB] Lỗi kết nối SQL Server:", err.message);
    process.exit(1);
  }
}