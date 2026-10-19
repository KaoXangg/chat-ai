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
    pool: {
      max: Number(process.env.CHAT_LOCK_POOL_MAX) || 20,
      min: 0,
      acquire: Number(process.env.CHAT_LOCK_ACQUIRE_MS) || 5000,
      idle: 10000,
    },
  }
);

/**
 * Thêm các cột mới vào bảng đã có (sync() không tự thêm cột). An toàn khi chạy lại nhiều lần.
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

    IF OBJECT_ID('dbo.TokenUsages', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TokenUsages_userId_createdAt' AND object_id = OBJECT_ID('dbo.TokenUsages'))
      CREATE NONCLUSTERED INDEX IX_TokenUsages_userId_createdAt ON dbo.TokenUsages(userId ASC, createdAt ASC);

    IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Conversations_userId_createdAt' AND object_id = OBJECT_ID('dbo.Conversations'))
      CREATE NONCLUSTERED INDEX IX_Conversations_userId_createdAt ON dbo.Conversations(userId ASC, createdAt DESC);

    IF OBJECT_ID('dbo.Messages', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Messages_conversationId_createdAt' AND object_id = OBJECT_ID('dbo.Messages'))
      CREATE NONCLUSTERED INDEX IX_Messages_conversationId_createdAt ON dbo.Messages(conversationId ASC, createdAt ASC);
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

  await sequelize.query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'systemPrompt') IS NULL
    BEGIN
      ALTER TABLE dbo.Users ADD systemPrompt NVARCHAR(2000) NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL AND COL_LENGTH('dbo.Conversations', 'systemPrompt') IS NULL
    BEGIN
      ALTER TABLE dbo.Conversations ADD systemPrompt NVARCHAR(2000) NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL AND COL_LENGTH('dbo.Conversations', 'shareId') IS NULL
    BEGIN
      ALTER TABLE dbo.Conversations ADD shareId NVARCHAR(50) NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL AND COL_LENGTH('dbo.Conversations', 'folderId') IS NULL
    BEGIN
      ALTER TABLE dbo.Conversations ADD folderId INT NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL AND COL_LENGTH('dbo.Conversations', 'personaId') IS NULL
    BEGIN
      ALTER TABLE dbo.Conversations ADD personaId INT NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'customDailyTokenLimit') IS NULL
    BEGIN
      ALTER TABLE dbo.Users ADD customDailyTokenLimit INT NULL;
    END
  `);

  await sequelize.query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL AND COL_LENGTH('dbo.Users', 'userTier') IS NULL
    BEGIN
      ALTER TABLE dbo.Users ADD userTier NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_userTier DEFAULT ('free');
    END
    IF OBJECT_ID('dbo.SystemSettings', 'U') IS NOT NULL AND COL_LENGTH('dbo.SystemSettings', 'blockedKeywords') IS NULL
    BEGIN
      ALTER TABLE dbo.SystemSettings ADD blockedKeywords NVARCHAR(MAX) NULL;
    END

    IF OBJECT_ID('dbo.Sessions', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Sessions (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        userId           INT NOT NULL,
        sessionToken     NVARCHAR(64) NOT NULL,
        refreshTokenHash NVARCHAR(64) NOT NULL,
        deviceType       NVARCHAR(20) NOT NULL CONSTRAINT DF_Sessions_deviceType DEFAULT ('desktop'),
        os               NVARCHAR(50) NULL,
        browser          NVARCHAR(50) NULL,
        ipAddress        NVARCHAR(50) NULL,
        userAgent        NVARCHAR(500) NULL,
        rememberMe       BIT NOT NULL CONSTRAINT DF_Sessions_rememberMe DEFAULT (0),
        isRevoked        BIT NOT NULL CONSTRAINT DF_Sessions_isRevoked DEFAULT (0),
        lastActiveAt     DATETIME2 NOT NULL CONSTRAINT DF_Sessions_lastActiveAt DEFAULT (SYSUTCDATETIME()),
        expiresAt        DATETIME2 NOT NULL,
        createdAt        DATETIME2 NOT NULL CONSTRAINT DF_Sessions_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt        DATETIME2 NOT NULL CONSTRAINT DF_Sessions_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Sessions_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_Sessions_sessionToken UNIQUE (sessionToken)
      );
      CREATE INDEX IX_Sessions_userId ON dbo.Sessions(userId);
      CREATE INDEX IX_Sessions_refreshTokenHash ON dbo.Sessions(refreshTokenHash);
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
    await sequelize.sync();
    await ensureSchemaUpdates();
    console.log("[DB] SQL Server sẵn sàng.");
  } catch (err) {
    console.error("[DB] Lỗi kết nối SQL Server:", err.message);
    process.exit(1);
  }
}
