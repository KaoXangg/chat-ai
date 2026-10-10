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
    logging: process.env.DB_LOG_SQL === "true" ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { freezeTableName: true },
  }
);

// Streaming application locks reserve a connection for the entire response.
// Keep those leases out of the query pool so streams can still save messages.
export const chatLockDatabase = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    ...sequelize.options,
    logging: false,
    pool: { max: 20, min: 0, acquire: 5000, idle: 10000 },
  }
);

/**
 * Thêm các cột mới vào bảng đã có (sync() không tự thêm cột). An toàn khi chạy lại nhiều lần.
 * - AIModels.dailyTokenLimit: hạn mức token/ngày cho mỗi người dùng (0 = không giới hạn).
 * - Users.uiLanguage / Users.aiLanguage: ngôn ngữ giao diện và ngôn ngữ AI trả lời.
 */
export async function ensureSchemaUpdates() {
  await sequelize.query(`
    IF COL_LENGTH('dbo.PasswordResets', 'attempts') IS NULL
      ALTER TABLE dbo.PasswordResets ADD attempts INT NOT NULL CONSTRAINT DF_PasswordResets_attempts DEFAULT (0);
    IF COL_LENGTH('dbo.Users', 'tokenVersion') IS NULL
      ALTER TABLE dbo.Users ADD tokenVersion INT NOT NULL CONSTRAINT DF_Users_tokenVersion DEFAULT (0);
    IF COL_LENGTH('dbo.Messages', 'requestId') IS NULL
      ALTER TABLE dbo.Messages ADD requestId NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.Messages', 'imageBase64') IS NULL
      ALTER TABLE dbo.Messages ADD imageBase64 NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.Messages', 'imageMimeType') IS NULL
      ALTER TABLE dbo.Messages ADD imageMimeType NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.Messages', 'images') IS NULL
      ALTER TABLE dbo.Messages ADD images NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.Messages', 'sources') IS NULL
      ALTER TABLE dbo.Messages ADD sources NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.Messages', 'feedback') IS NULL
      ALTER TABLE dbo.Messages ADD feedback NVARCHAR(10) NULL;
    IF COL_LENGTH('dbo.Messages', 'isError') IS NULL
      ALTER TABLE dbo.Messages ADD isError BIT NOT NULL CONSTRAINT DF_Messages_isError DEFAULT (0);
  `);
  await sequelize.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Messages_requestId' AND object_id = OBJECT_ID('dbo.Messages'))
      CREATE UNIQUE INDEX UQ_Messages_requestId ON dbo.Messages(conversationId, requestId) WHERE requestId IS NOT NULL;
  `);
  await sequelize.query(`
    IF OBJECT_ID('dbo.Messages', 'U') IS NOT NULL AND COL_LENGTH('dbo.Messages', 'interrupted') IS NULL
    BEGIN
      ALTER TABLE dbo.Messages ADD interrupted BIT NOT NULL CONSTRAINT DF_Messages_interrupted DEFAULT (0);
    END
  `);
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

    // Create missing tables, but do not alter existing SQL Server tables at startup.
    // Sequelize's MSSQL alter path can generate invalid `ALTER COLUMN ... UNIQUE` SQL.
    // Apply schema changes with backend/sql/schema.sql or a migration instead.
    await sequelize.sync();
    await ensureSchemaUpdates();
    console.log("[DB] SQL Server sẵn sàng.");
  } catch (err) {
    console.error("[DB] Lỗi kết nối SQL Server:", err.message);
    process.exit(1);
  }
}
