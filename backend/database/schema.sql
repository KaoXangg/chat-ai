/* =============================================================================
   Chat AI - CSDL Microsoft SQL Server (Transact-SQL)
   File khởi tạo toàn bộ cấu trúc cơ sở dữ liệu hoàn chỉnh, chuẩn hóa 12 bảng.
   Đặc tính:
     - Tương thích hoàn toàn với Sequelize 6 và schema thực tế của hệ thống.
     - Tính lũy đẳng (Idempotent): Có thể chạy lại nhiều lần an toàn, không làm mất dữ liệu.
     - Hỗ trợ tạo mới DB trên máy mới hoặc nâng cấp các bảng đã tồn tại.
   ============================================================================= */

-- 0. Tạo cơ sở dữ liệu nếu chưa tồn tại
IF DB_ID(N'chat_ai') IS NULL
BEGIN
    CREATE DATABASE [chat_ai];
END
GO

USE [chat_ai];
GO

SET NOCOUNT ON;
GO

-- =============================================================================
-- 1. BẢNG Users (Người dùng hệ thống & quản trị viên)
-- =============================================================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        username              NVARCHAR(32)   NOT NULL,
        email                 NVARCHAR(255)  NOT NULL,
        passwordHash          NVARCHAR(255)  NOT NULL,
        role                  NVARCHAR(10)   NOT NULL CONSTRAINT DF_Users_role DEFAULT ('user'),
        status                NVARCHAR(10)   NOT NULL CONSTRAINT DF_Users_status DEFAULT ('active'),
        avatar                NVARCHAR(500)  NULL     CONSTRAINT DF_Users_avatar DEFAULT (''),
        uiLanguage            NVARCHAR(10)   NULL,
        aiLanguage            NVARCHAR(10)   NOT NULL CONSTRAINT DF_Users_aiLanguage DEFAULT ('auto'),
        tokenVersion          INT            NOT NULL CONSTRAINT DF_Users_tokenVersion DEFAULT (0),
        systemPrompt          NVARCHAR(2000) NULL,
        customDailyTokenLimit INT            NULL,
        userTier              NVARCHAR(20)   NOT NULL CONSTRAINT DF_Users_userTier DEFAULT ('free'),
        createdAt             DATETIME2      NOT NULL CONSTRAINT DF_Users_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt             DATETIME2      NOT NULL CONSTRAINT DF_Users_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Users_email UNIQUE (email),
        CONSTRAINT CK_Users_role CHECK (role IN ('user', 'admin')),
        CONSTRAINT CK_Users_status CHECK (status IN ('active', 'banned')),
        CONSTRAINT CK_Users_userTier CHECK (userTier IN ('free', 'plus', 'premium', 'pro', 'vip'))
    );
END
GO

-- Nâng cấp các cột nếu Users đã được tạo trước đó
IF COL_LENGTH('dbo.Users', 'uiLanguage') IS NULL
    ALTER TABLE dbo.Users ADD uiLanguage NVARCHAR(10) NULL;
IF COL_LENGTH('dbo.Users', 'aiLanguage') IS NULL
    ALTER TABLE dbo.Users ADD aiLanguage NVARCHAR(10) NOT NULL CONSTRAINT DF_Users_aiLanguage DEFAULT ('auto');
IF COL_LENGTH('dbo.Users', 'tokenVersion') IS NULL
    ALTER TABLE dbo.Users ADD tokenVersion INT NOT NULL CONSTRAINT DF_Users_tokenVersion DEFAULT (0);
IF COL_LENGTH('dbo.Users', 'systemPrompt') IS NULL
    ALTER TABLE dbo.Users ADD systemPrompt NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.Users', 'customDailyTokenLimit') IS NULL
    ALTER TABLE dbo.Users ADD customDailyTokenLimit INT NULL;
IF COL_LENGTH('dbo.Users', 'userTier') IS NULL
    ALTER TABLE dbo.Users ADD userTier NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_userTier DEFAULT ('free');
GO

-- =============================================================================
-- 2. BẢNG AIModels (Danh mục các mô hình AI tích hợp)
-- =============================================================================
IF OBJECT_ID('dbo.AIModels', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AIModels (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        provider        NVARCHAR(50)   NOT NULL,
        modelId         NVARCHAR(150)  NOT NULL,
        displayName     NVARCHAR(150)  NOT NULL,
        description     NVARCHAR(500)  NULL     CONSTRAINT DF_AIModels_description DEFAULT (''),
        capabilities    NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_AIModels_capabilities DEFAULT (N'["text"]'),
        contextLength   INT            NOT NULL CONSTRAINT DF_AIModels_contextLength DEFAULT (8192),
        enabled         BIT            NOT NULL CONSTRAINT DF_AIModels_enabled DEFAULT (1),
        isDefault       BIT            NOT NULL CONSTRAINT DF_AIModels_isDefault DEFAULT (0),
        priority        INT            NOT NULL CONSTRAINT DF_AIModels_priority DEFAULT (0),
        dailyTokenLimit INT            NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0),
        createdAt       DATETIME2      NOT NULL CONSTRAINT DF_AIModels_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt       DATETIME2      NOT NULL CONSTRAINT DF_AIModels_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_AIModels_provider_modelId UNIQUE (provider, modelId)
    );
END
GO

IF COL_LENGTH('dbo.AIModels', 'dailyTokenLimit') IS NULL
    ALTER TABLE dbo.AIModels ADD dailyTokenLimit INT NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0);
GO

-- =============================================================================
-- 3. BẢNG SystemSettings (Cấu hình hệ thống chung, API key mã hóa, bảo trì)
-- =============================================================================
IF OBJECT_ID('dbo.SystemSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SystemSettings (
        id                     INT NOT NULL CONSTRAINT PK_SystemSettings PRIMARY KEY CONSTRAINT DF_SystemSettings_id DEFAULT (1),
        allowRegistration      BIT NOT NULL CONSTRAINT DF_SystemSettings_allowRegistration DEFAULT (1),
        maintenanceMode        BIT NOT NULL CONSTRAINT DF_SystemSettings_maintenanceMode DEFAULT (0),
        maintenanceMessage     NVARCHAR(500) NOT NULL CONSTRAINT DF_SystemSettings_maintenanceMessage DEFAULT (N'Hệ thống đang bảo trì để nâng cấp tính năng. Vui lòng quay lại sau ít phút.'),
        globalSystemPrompt     NVARCHAR(MAX) NULL CONSTRAINT DF_SystemSettings_globalSystemPrompt DEFAULT (N''),
        defaultUserDailyTokens INT NOT NULL CONSTRAINT DF_SystemSettings_defaultUserDailyTokens DEFAULT (50000),
        rateLimitPerMinute     INT NOT NULL CONSTRAINT DF_SystemSettings_rateLimitPerMinute DEFAULT (30),
        geminiApiKey           NVARCHAR(255) NULL,
        groqApiKey             NVARCHAR(255) NULL,
        openrouterApiKey       NVARCHAR(255) NULL,
        tavilyApiKey           NVARCHAR(255) NULL,
        blockedKeywords        NVARCHAR(MAX) NULL,
        createdAt              DATETIMEOFFSET NOT NULL CONSTRAINT DF_SystemSettings_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt              DATETIMEOFFSET NOT NULL CONSTRAINT DF_SystemSettings_updatedAt DEFAULT (SYSUTCDATETIME())
    );
END
GO

IF COL_LENGTH('dbo.SystemSettings', 'blockedKeywords') IS NULL
    ALTER TABLE dbo.SystemSettings ADD blockedKeywords NVARCHAR(MAX) NULL;
GO

-- =============================================================================
-- 4. BẢNG Announcements (Thông báo hệ thống gửi đến người dùng)
-- =============================================================================
IF OBJECT_ID('dbo.Announcements', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Announcements (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        title       NVARCHAR(255)  NOT NULL,
        content     NVARCHAR(MAX)  NOT NULL,
        type        NVARCHAR(50)   NOT NULL CONSTRAINT DF_Announcements_type DEFAULT (N'info'),
        active      BIT            NOT NULL CONSTRAINT DF_Announcements_active DEFAULT (1),
        dismissible BIT            NOT NULL CONSTRAINT DF_Announcements_dismissible DEFAULT (1),
        startsAt    DATETIMEOFFSET NULL,
        expiresAt   DATETIMEOFFSET NULL,
        createdAt   DATETIMEOFFSET NOT NULL CONSTRAINT DF_Announcements_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt   DATETIMEOFFSET NOT NULL CONSTRAINT DF_Announcements_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_Announcements_type CHECK (type IN ('info', 'warning', 'success', 'promo'))
    );
END
GO

-- =============================================================================
-- 5. BẢNG Folders (Thư mục gom nhóm các cuộc trò chuyện của người dùng)
-- =============================================================================
IF OBJECT_ID('dbo.Folders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Folders (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        userId    INT            NOT NULL,
        name      NVARCHAR(100)  NOT NULL,
        color     NVARCHAR(30)   NOT NULL CONSTRAINT DF_Folders_color DEFAULT (N'#6366f1'),
        icon      NVARCHAR(50)   NOT NULL CONSTRAINT DF_Folders_icon DEFAULT (N'Folder'),
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Folders_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Folders_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Folders_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Folders_userId' AND object_id = OBJECT_ID('dbo.Folders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Folders_userId ON dbo.Folders (userId ASC);
END
GO

-- =============================================================================
-- 6. BẢNG Personas (Trợ lý chuyên gia / Persona cá nhân hóa)
-- =============================================================================
IF OBJECT_ID('dbo.Personas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Personas (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        userId           INT            NULL, -- NULL: Persona công khai của hệ thống, NOT NULL: Persona riêng của user
        name             NVARCHAR(100)  NOT NULL,
        role             NVARCHAR(100)  NOT NULL,
        description      NVARCHAR(255)  NULL,
        systemPrompt     NVARCHAR(MAX)  NOT NULL,
        avatar           NVARCHAR(255)  NULL CONSTRAINT DF_Personas_avatar DEFAULT (N'🤖'),
        category         NVARCHAR(50)   NOT NULL CONSTRAINT DF_Personas_category DEFAULT (N'general'),
        suggestedPrompts NVARCHAR(MAX)  NULL,
        createdAt        DATETIMEOFFSET NOT NULL CONSTRAINT DF_Personas_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt        DATETIMEOFFSET NOT NULL CONSTRAINT DF_Personas_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Personas_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Personas_userId' AND object_id = OBJECT_ID('dbo.Personas'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Personas_userId ON dbo.Personas (userId ASC);
END
GO

-- =============================================================================
-- 7. BẢNG Conversations (Cuộc trò chuyện giữa người dùng và AI)
-- =============================================================================
IF OBJECT_ID('dbo.Conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Conversations (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        userId       INT            NOT NULL,
        title        NVARCHAR(120)  NOT NULL CONSTRAINT DF_Conversations_title DEFAULT (N'Cuộc trò chuyện mới'),
        provider     NVARCHAR(50)   NOT NULL CONSTRAINT DF_Conversations_provider DEFAULT ('openrouter'),
        model        NVARCHAR(150)  NOT NULL CONSTRAINT DF_Conversations_model DEFAULT ('openrouter/free'),
        pinned       BIT            NOT NULL CONSTRAINT DF_Conversations_pinned DEFAULT (0),
        systemPrompt NVARCHAR(2000) NULL,
        shareId      NVARCHAR(50)   NULL,
        folderId     INT            NULL,
        personaId    INT            NULL,
        createdAt    DATETIME2      NOT NULL CONSTRAINT DF_Conversations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt    DATETIME2      NOT NULL CONSTRAINT DF_Conversations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Conversations_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT FK_Conversations_folderId FOREIGN KEY (folderId) REFERENCES dbo.Folders(id) ON DELETE NO ACTION,
        CONSTRAINT FK_Conversations_personaId FOREIGN KEY (personaId) REFERENCES dbo.Personas(id) ON DELETE NO ACTION
    );
END
GO

IF COL_LENGTH('dbo.Conversations', 'systemPrompt') IS NULL
    ALTER TABLE dbo.Conversations ADD systemPrompt NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.Conversations', 'shareId') IS NULL
    ALTER TABLE dbo.Conversations ADD shareId NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.Conversations', 'folderId') IS NULL
    ALTER TABLE dbo.Conversations ADD folderId INT NULL;
IF COL_LENGTH('dbo.Conversations', 'personaId') IS NULL
    ALTER TABLE dbo.Conversations ADD personaId INT NULL;
GO

-- Composite Index cho Conversations: Tối ưu tải danh sách chat theo người dùng và thời gian
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Conversations_userId_createdAt' AND object_id = OBJECT_ID('dbo.Conversations'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Conversations_userId_createdAt 
    ON dbo.Conversations (userId ASC, createdAt DESC);
END
GO

-- =============================================================================
-- 8. BẢNG Messages (Tin nhắn hỏi đáp trong từng cuộc trò chuyện)
-- =============================================================================
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Messages (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        conversationId INT            NOT NULL,
        role           NVARCHAR(10)   NOT NULL,
        content        NVARCHAR(MAX)  NOT NULL,
        provider       NVARCHAR(50)   NULL,
        model          NVARCHAR(150)  NULL,
        feedback       NVARCHAR(10)   NULL,
        isError        BIT            NOT NULL CONSTRAINT DF_Messages_isError DEFAULT (0),
        interrupted    BIT            NOT NULL CONSTRAINT DF_Messages_interrupted DEFAULT (0),
        requestId      NVARCHAR(100)  NULL,
        imageBase64    NVARCHAR(MAX)  NULL,
        imageMimeType  NVARCHAR(50)   NULL,
        images         NVARCHAR(MAX)  NULL,
        sources        NVARCHAR(MAX)  NULL,
        createdAt      DATETIME2      NOT NULL CONSTRAINT DF_Messages_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt      DATETIME2      NOT NULL CONSTRAINT DF_Messages_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Messages_conversationId FOREIGN KEY (conversationId) REFERENCES dbo.Conversations(id) ON DELETE CASCADE,
        CONSTRAINT CK_Messages_role CHECK (role IN ('user', 'assistant', 'system'))
    );
END
GO

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
IF COL_LENGTH('dbo.Messages', 'interrupted') IS NULL
    ALTER TABLE dbo.Messages ADD interrupted BIT NOT NULL CONSTRAINT DF_Messages_interrupted DEFAULT (0);
GO

-- Composite Index cho Messages: Tải lịch sử tin nhắn trong cuộc trò chuyện theo thứ tự thời gian
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Messages_conversationId_createdAt' AND object_id = OBJECT_ID('dbo.Messages'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Messages_conversationId_createdAt 
    ON dbo.Messages (conversationId ASC, createdAt ASC);
END
GO

-- Filtered Unique Index cho Idempotent Replay Stream: Tránh trùng requestId trong cùng hội thoại
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Messages_requestId' AND object_id = OBJECT_ID('dbo.Messages'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Messages_requestId 
    ON dbo.Messages (conversationId, requestId) 
    WHERE requestId IS NOT NULL;
END
GO

-- =============================================================================
-- 9. BẢNG PasswordResets (Mã OTP xác thực đặt lại mật khẩu)
-- =============================================================================
IF OBJECT_ID('dbo.PasswordResets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResets (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        userId    INT            NOT NULL,
        otpHash   NVARCHAR(255)  NOT NULL,
        expiresAt DATETIMEOFFSET NOT NULL,
        used      BIT            NOT NULL CONSTRAINT DF_PasswordResets_used DEFAULT (0),
        attempts  INT            NOT NULL CONSTRAINT DF_PasswordResets_attempts DEFAULT (0),
        createdAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_PasswordResets_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_PasswordResets_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_PasswordResets_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

IF COL_LENGTH('dbo.PasswordResets', 'attempts') IS NULL
    ALTER TABLE dbo.PasswordResets ADD attempts INT NOT NULL CONSTRAINT DF_PasswordResets_attempts DEFAULT (0);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PasswordResets_userId' AND object_id = OBJECT_ID('dbo.PasswordResets'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PasswordResets_userId ON dbo.PasswordResets (userId ASC);
END
GO

-- =============================================================================
-- 10. BẢNG TokenUsages (Sổ cái token: ghi nhận lượt gọi AI để tính hạn mức quota)
-- =============================================================================
IF OBJECT_ID('dbo.TokenUsages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TokenUsages (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        userId           INT            NOT NULL,
        provider         NVARCHAR(50)   NOT NULL,
        modelId          NVARCHAR(150)  NOT NULL,
        promptTokens     INT            NOT NULL CONSTRAINT DF_TokenUsages_promptTokens DEFAULT (0),
        completionTokens INT            NOT NULL CONSTRAINT DF_TokenUsages_completionTokens DEFAULT (0),
        totalTokens      INT            NOT NULL CONSTRAINT DF_TokenUsages_totalTokens DEFAULT (0),
        estimated        BIT            NOT NULL CONSTRAINT DF_TokenUsages_estimated DEFAULT (0),
        createdAt        DATETIMEOFFSET NOT NULL CONSTRAINT DF_TokenUsages_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TokenUsages_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

-- Composite Index cho TokenUsages: Tối ưu tra cứu cộng dồn quota theo user và khung thời gian
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TokenUsages_userId_createdAt' AND object_id = OBJECT_ID('dbo.TokenUsages'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_TokenUsages_userId_createdAt 
    ON dbo.TokenUsages (userId ASC, createdAt ASC)
    INCLUDE (totalTokens, promptTokens, completionTokens, provider, modelId);
END
GO

-- =============================================================================
-- 11. BẢNG Sessions (Quản lý phiên đăng nhập thiết bị và refresh token)
-- =============================================================================
IF OBJECT_ID('dbo.Sessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sessions (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        userId           INT            NOT NULL,
        sessionToken     NVARCHAR(64)   NOT NULL,
        refreshTokenHash NVARCHAR(64)   NOT NULL,
        deviceType       NVARCHAR(20)   NOT NULL CONSTRAINT DF_Sessions_deviceType DEFAULT ('desktop'),
        os               NVARCHAR(50)   NULL,
        browser          NVARCHAR(50)   NULL,
        ipAddress        NVARCHAR(50)   NULL,
        userAgent        NVARCHAR(500)  NULL,
        rememberMe       BIT            NOT NULL CONSTRAINT DF_Sessions_rememberMe DEFAULT (0),
        isRevoked        BIT            NOT NULL CONSTRAINT DF_Sessions_isRevoked DEFAULT (0),
        lastActiveAt     DATETIMEOFFSET NOT NULL CONSTRAINT DF_Sessions_lastActiveAt DEFAULT (SYSUTCDATETIME()),
        expiresAt        DATETIMEOFFSET NOT NULL,
        createdAt        DATETIMEOFFSET NOT NULL CONSTRAINT DF_Sessions_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt        DATETIMEOFFSET NOT NULL CONSTRAINT DF_Sessions_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Sessions_userId FOREIGN KEY (userId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_Sessions_sessionToken UNIQUE (sessionToken),
        CONSTRAINT CK_Sessions_deviceType CHECK (deviceType IN ('desktop', 'mobile', 'tablet'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_userId' AND object_id = OBJECT_ID('dbo.Sessions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Sessions_userId ON dbo.Sessions (userId ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_refreshTokenHash' AND object_id = OBJECT_ID('dbo.Sessions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Sessions_refreshTokenHash ON dbo.Sessions (refreshTokenHash ASC);
END
GO

-- =============================================================================
-- 12. BẢNG AuditLogs (Nhật ký kiểm toán các thao tác của Quản trị viên)
-- =============================================================================
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        adminId       INT            NULL,
        adminUsername NVARCHAR(100)  NULL,
        action        NVARCHAR(50)   NOT NULL,
        targetType    NVARCHAR(50)   NULL,
        targetId      NVARCHAR(100)  NULL,
        details       NVARCHAR(MAX)  NULL,
        ipAddress     NVARCHAR(100)  NULL,
        createdAt     DATETIMEOFFSET NOT NULL CONSTRAINT DF_AuditLogs_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AuditLogs_adminId FOREIGN KEY (adminId) REFERENCES dbo.Users(id) ON DELETE SET NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_adminId' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_adminId ON dbo.AuditLogs (adminId ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_action' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_action ON dbo.AuditLogs (action ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_createdAt' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_createdAt ON dbo.AuditLogs (createdAt ASC);
END
GO

PRINT N'Cơ sở dữ liệu Chat AI đã được khởi tạo/cập nhật thành công với 12 bảng.';
GO
