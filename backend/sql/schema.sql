/* ============================================================
   Chat AI - SQL Server Schema
   Chạy tập lệnh này trên cơ sở dữ liệu trống (ví dụ: chat_ai) bằng SSMS,
   Azure Data Studio hoặc sqlcmd trước khi khởi động backend.
   Thứ tự bảng: Users -> Conversations -> Messages; AIModels độc lập.
   ============================================================ */

/* Bo comment 2 dong duoi neu can tu tao database (chay tach rieng,
   ngoài phạm vi transaction vì CREATE DATABASE không thể nằm trong batch
   cùng với các lệnh khác):

CREATE DATABASE chat_ai;
GO
*/

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
    imageBase64     NVARCHAR(MAX)  NULL,
    imageMimeType   NVARCHAR(50)   NULL,
    images          NVARCHAR(MAX)  NULL, -- JSON array [{mimeType, data}, ...] cho tin nhan nhieu anh (ChatGPT-style)
    sources         NVARCHAR(MAX)  NULL, -- JSON array nguon tim kiem web
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
