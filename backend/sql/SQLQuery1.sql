/* ============================================================
   Chat AI - SQL Server Schema
   Chạy tập lệnh này trên cơ sở dữ liệu trống (ví dụ: chat_ai) bằng SSMS,
   Azure Data Studio hoặc sqlcmd trước khi khởi động backend.
   Thứ tự bảng: Users -> Conversations -> Messages; AIModels độc lập.
   ============================================================ */

/* Bỏ chú thích hai dòng dưới nếu cần tự tạo cơ sở dữ liệu (chạy riêng,
   ngoài transaction vì CREATE DATABASE không thể nằm trong batch
   cùng với các lệnh khác):
   */

CREATE DATABASE chat_ai;
GO


USE chat_ai;
GO

/* ---------- Users ---------- */
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO
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
GO

/* ---------- Conversations ---------- */
IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL DROP TABLE dbo.Conversations;
GO
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
GO
CREATE INDEX IX_Conversations_userId ON dbo.Conversations(userId);
GO

/* ---------- Messages ---------- */
IF OBJECT_ID('dbo.Messages', 'U') IS NOT NULL DROP TABLE dbo.Messages;
GO
CREATE TABLE dbo.Messages (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    conversationId  INT            NOT NULL,
    role            NVARCHAR(10)   NOT NULL,
    content         NVARCHAR(MAX)  NOT NULL,
    provider        NVARCHAR(50)   NULL,
    model           NVARCHAR(150)  NULL,
    feedback        NVARCHAR(10)   NULL,
    isError         BIT            NOT NULL CONSTRAINT DF_Messages_isError DEFAULT (0),
    createdAt       DATETIME2      NOT NULL CONSTRAINT DF_Messages_createdAt DEFAULT (SYSUTCDATETIME()),
    updatedAt       DATETIME2      NOT NULL CONSTRAINT DF_Messages_updatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Messages_Conversation FOREIGN KEY (conversationId) REFERENCES dbo.Conversations(id) ON DELETE CASCADE,
    CONSTRAINT CK_Messages_role CHECK (role IN ('user', 'assistant')),
    CONSTRAINT CK_Messages_feedback CHECK (feedback IS NULL OR feedback IN ('like', 'dislike'))
);
GO
CREATE INDEX IX_Messages_conversationId ON dbo.Messages(conversationId);
GO

/* ---------- AIModels ---------- */
IF OBJECT_ID('dbo.AIModels', 'U') IS NOT NULL DROP TABLE dbo.AIModels;
GO
CREATE TABLE dbo.AIModels (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    provider       NVARCHAR(50)   NOT NULL,
    modelId        NVARCHAR(150)  NOT NULL,
    displayName    NVARCHAR(150)  NOT NULL,
    description    NVARCHAR(500)  NULL CONSTRAINT DF_AIModels_description DEFAULT (''),
    capabilities   NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_AIModels_capabilities DEFAULT (N'["text"]'), -- luu JSON array dang chuoi
    contextLength  INT            NOT NULL CONSTRAINT DF_AIModels_contextLength DEFAULT (8192),
    enabled        BIT            NOT NULL CONSTRAINT DF_AIModels_enabled DEFAULT (1),
    isDefault      BIT            NOT NULL CONSTRAINT DF_AIModels_isDefault DEFAULT (0),
    priority       INT            NOT NULL CONSTRAINT DF_AIModels_priority DEFAULT (0),
    createdAt      DATETIME2      NOT NULL CONSTRAINT DF_AIModels_createdAt DEFAULT (SYSUTCDATETIME()),
    updatedAt      DATETIME2      NOT NULL CONSTRAINT DF_AIModels_updatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_AIModels_provider_modelId UNIQUE (provider, modelId)
);
GO

PRINT 'Da tao xong schema Chat AI tren SQL Server.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'imageBase64')
    ALTER TABLE dbo.Messages ADD imageBase64 NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'imageMimeType')
    ALTER TABLE dbo.Messages ADD imageMimeType NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'sources')
    ALTER TABLE dbo.Messages ADD sources NVARCHAR(MAX) NULL;
GO

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

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'images'
)
BEGIN
    ALTER TABLE dbo.Messages ADD images NVARCHAR(MAX) NULL;
    PRINT 'Da them cot Messages.images.';
END
ELSE
BEGIN
    PRINT 'Cot Messages.images da ton tai, bo qua.';
END
GO