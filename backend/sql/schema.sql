/* ============================================================
   Chat AI - SQL Server Schema (idempotent: chạy lại nhiều lần vẫn an toàn,
   KHÔNG xóa dữ liệu hiện có).
   Chạy bằng SSMS / Azure Data Studio / sqlcmd. Backend cũng tự tạo bảng thiếu
   khi khởi động (sequelize.sync) nên file này chủ yếu để cài mới hoặc nâng cấp.
   Thứ tự: Users -> Conversations -> Messages; AIModels, PasswordResets, TokenUsages.
   ============================================================ */

IF DB_ID(N'chat_ai') IS NULL
    CREATE DATABASE chat_ai;
GO

USE chat_ai;
GO

/* ---------- Users ---------- */
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        username      NVARCHAR(32)   NOT NULL,
        email         NVARCHAR(255)  NOT NULL,
        passwordHash  NVARCHAR(255)  NOT NULL,
        role          NVARCHAR(10)   NOT NULL CONSTRAINT DF_Users_role DEFAULT ('user'),
        status        NVARCHAR(10)   NOT NULL CONSTRAINT DF_Users_status DEFAULT ('active'),
        avatar        NVARCHAR(500)  NULL     CONSTRAINT DF_Users_avatar DEFAULT (''),
        createdAt     DATETIME2      NOT NULL CONSTRAINT DF_Users_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt     DATETIME2      NOT NULL CONSTRAINT DF_Users_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Users_email UNIQUE (email),
        CONSTRAINT CK_Users_role CHECK (role IN ('user', 'admin')),
        CONSTRAINT CK_Users_status CHECK (status IN ('active', 'banned'))
    );
END
GO

/* Nâng cấp DB cũ: ngôn ngữ trả lời của AI do người dùng chọn ('auto' = theo tin nhắn) */
IF COL_LENGTH('dbo.Users', 'aiLanguage') IS NULL
    ALTER TABLE dbo.Users ADD aiLanguage NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_aiLanguage DEFAULT ('auto');
GO

/* ---------- Conversations ---------- */
IF OBJECT_ID('dbo.Conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Conversations (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        userId      INT           NOT NULL,
        title       NVARCHAR(120) NOT NULL CONSTRAINT DF_Conversations_title DEFAULT (N'Cuộc trò chuyện mới'),
        provider    NVARCHAR(50)  NOT NULL CONSTRAINT DF_Conversations_provider DEFAULT ('openrouter'),
        model       NVARCHAR(150) NOT NULL CONSTRAINT DF_Conversations_model DEFAULT ('openrouter/free'),
        pinned      BIT           NOT NULL CONSTRAINT DF_Conversations_pinned DEFAULT (0),
        createdAt   DATETIME2     NOT NULL CONSTRAINT DF_Conversations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt   DATETIME2     NOT NULL CONSTRAINT DF_Conversations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Conversations_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Conversations_userId' AND object_id = OBJECT_ID('dbo.Conversations'))
    CREATE INDEX IX_Conversations_userId ON dbo.Conversations(userId);
GO

/* ---------- Messages ---------- */
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Messages (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        conversationId  INT            NOT NULL,
        role            NVARCHAR(10)   NOT NULL,
        content         NVARCHAR(MAX)  NOT NULL,
        provider        NVARCHAR(50)   NULL,
        model           NVARCHAR(150)  NULL,
        imageBase64     NVARCHAR(MAX)  NULL,
        imageMimeType   NVARCHAR(50)   NULL,
        images          NVARCHAR(MAX)  NULL, -- JSON array [{mimeType, data}, ...] cho tin nhắn nhiều ảnh
        sources         NVARCHAR(MAX)  NULL, -- JSON array nguồn tìm kiếm web
        feedback        NVARCHAR(10)   NULL,
        isError         BIT            NOT NULL CONSTRAINT DF_Messages_isError DEFAULT (0),
        interrupted     BIT            NOT NULL CONSTRAINT DF_Messages_interrupted DEFAULT (0),
        createdAt       DATETIME2      NOT NULL CONSTRAINT DF_Messages_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt       DATETIME2      NOT NULL CONSTRAINT DF_Messages_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Messages_Conversation FOREIGN KEY (conversationId) REFERENCES dbo.Conversations(id) ON DELETE CASCADE,
        CONSTRAINT CK_Messages_role CHECK (role IN ('user', 'assistant')),
        CONSTRAINT CK_Messages_feedback CHECK (feedback IS NULL OR feedback IN ('like', 'dislike'))
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Messages_conversationId' AND object_id = OBJECT_ID('dbo.Messages'))
    CREATE INDEX IX_Messages_conversationId ON dbo.Messages(conversationId);
GO

/* Nâng cấp DB cũ: thêm các cột Messages có thể còn thiếu */
IF COL_LENGTH('dbo.Messages', 'imageBase64')   IS NULL ALTER TABLE dbo.Messages ADD imageBase64   NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.Messages', 'imageMimeType') IS NULL ALTER TABLE dbo.Messages ADD imageMimeType NVARCHAR(50)  NULL;
IF COL_LENGTH('dbo.Messages', 'images')        IS NULL ALTER TABLE dbo.Messages ADD images        NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.Messages', 'sources')       IS NULL ALTER TABLE dbo.Messages ADD sources       NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.Messages', 'interrupted')   IS NULL ALTER TABLE dbo.Messages ADD interrupted BIT NOT NULL CONSTRAINT DF_Messages_interrupted DEFAULT (0);
GO

/* ---------- AIModels ---------- */
IF OBJECT_ID('dbo.AIModels', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AIModels (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        provider         NVARCHAR(50)   NOT NULL,
        modelId          NVARCHAR(150)  NOT NULL,
        displayName      NVARCHAR(150)  NOT NULL,
        description      NVARCHAR(500)  NULL CONSTRAINT DF_AIModels_description DEFAULT (''),
        capabilities     NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_AIModels_capabilities DEFAULT (N'["text"]'), -- JSON array dạng chuỗi
        contextLength    INT            NOT NULL CONSTRAINT DF_AIModels_contextLength DEFAULT (8192),
        dailyTokenLimit  INT            NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0),        -- 0 = không giới hạn
        enabled          BIT            NOT NULL CONSTRAINT DF_AIModels_enabled DEFAULT (1),
        isDefault        BIT            NOT NULL CONSTRAINT DF_AIModels_isDefault DEFAULT (0),
        priority         INT            NOT NULL CONSTRAINT DF_AIModels_priority DEFAULT (0),
        createdAt        DATETIME2      NOT NULL CONSTRAINT DF_AIModels_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt        DATETIME2      NOT NULL CONSTRAINT DF_AIModels_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_AIModels_provider_modelId UNIQUE (provider, modelId)
    );
END
GO
IF COL_LENGTH('dbo.AIModels', 'dailyTokenLimit') IS NULL
    ALTER TABLE dbo.AIModels ADD dailyTokenLimit INT NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0);
GO

/* ---------- PasswordResets ---------- */
IF OBJECT_ID('dbo.PasswordResets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResets (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        userId      INT            NOT NULL,
        otpHash     NVARCHAR(255)  NOT NULL,
        expiresAt   DATETIME2      NOT NULL,
        used        BIT            NOT NULL CONSTRAINT DF_PasswordResets_used DEFAULT (0),
        createdAt   DATETIME2      NOT NULL CONSTRAINT DF_PasswordResets_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt   DATETIME2      NOT NULL CONSTRAINT DF_PasswordResets_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_PasswordResets_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PasswordResets_userId' AND object_id = OBJECT_ID('dbo.PasswordResets'))
    CREATE INDEX IX_PasswordResets_userId ON dbo.PasswordResets(userId);
GO

/* ---------- TokenUsages (sổ cái token, không bị xóa khi xóa hội thoại) ---------- */
IF OBJECT_ID('dbo.TokenUsages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TokenUsages (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        userId            INT            NOT NULL,
        provider          NVARCHAR(50)   NOT NULL,
        modelId           NVARCHAR(150)  NOT NULL,
        promptTokens      INT            NOT NULL CONSTRAINT DF_TokenUsages_prompt DEFAULT (0),
        completionTokens  INT            NOT NULL CONSTRAINT DF_TokenUsages_completion DEFAULT (0),
        totalTokens       INT            NOT NULL CONSTRAINT DF_TokenUsages_total DEFAULT (0),
        estimated         BIT            NOT NULL CONSTRAINT DF_TokenUsages_estimated DEFAULT (0),
        createdAt         DATETIME2      NOT NULL CONSTRAINT DF_TokenUsages_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TokenUsages_User FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TokenUsages_userId_createdAt' AND object_id = OBJECT_ID('dbo.TokenUsages'))
    CREATE INDEX IX_TokenUsages_userId_createdAt ON dbo.TokenUsages(userId, createdAt);
GO

PRINT 'Schema Chat AI da san sang.';
GO
