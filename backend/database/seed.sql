/* =============================================================================
   Chat AI - Dữ liệu khởi tạo mặc định (Transact-SQL)
   File này mang tính lũy đẳng (Idempotent): Chạy nhiều lần không nhân đôi dữ liệu.
   KHÔNG chứa mật khẩu, secret hay API key thật.
   ============================================================================= */

USE [chat_ai];
GO

SET NOCOUNT ON;
GO

-- 1. Cài đặt hệ thống mặc định (SystemSetting id = 1)
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE id = 1)
BEGIN
    INSERT INTO dbo.SystemSettings (
        id, 
        allowRegistration, 
        maintenanceMode, 
        maintenanceMessage, 
        globalSystemPrompt, 
        defaultUserDailyTokens, 
        rateLimitPerMinute,
        createdAt,
        updatedAt
    )
    VALUES (
        1,
        1,
        0,
        N'Hệ thống đang bảo trì để nâng cấp tính năng. Vui lòng quay lại sau ít phút.',
        N'',
        50000,
        30,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
    PRINT N'[Seed] Đã khởi tạo cấu hình SystemSettings mặc định (id = 1).';
END
ELSE
BEGIN
    PRINT N'[Seed] SystemSettings (id = 1) đã tồn tại, bỏ qua.';
END
GO

-- 2. Danh mục mô hình AI mặc định (Khớp với backend/seed.js)
IF NOT EXISTS (SELECT 1 FROM dbo.AIModels WHERE provider = 'openrouter' AND modelId = 'openrouter/free')
BEGIN
    INSERT INTO dbo.AIModels (provider, modelId, displayName, description, capabilities, contextLength, enabled, isDefault, priority, dailyTokenLimit, createdAt, updatedAt)
    VALUES ('openrouter', 'openrouter/free', N'OpenRouter Free', N'Tự động chọn một mô hình miễn phí đang khả dụng trên OpenRouter.', N'["text"]', 32768, 1, 1, 0, 0, SYSUTCDATETIME(), SYSUTCDATETIME());
    PRINT N'[Seed] Đã thêm mô hình: OpenRouter Free';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AIModels WHERE provider = 'gemini' AND modelId = 'gemini-2.5-flash')
BEGIN
    INSERT INTO dbo.AIModels (provider, modelId, displayName, description, capabilities, contextLength, enabled, isDefault, priority, dailyTokenLimit, createdAt, updatedAt)
    VALUES ('gemini', 'gemini-2.5-flash', N'Gemini 2.5 Flash', N'Mô hình Google cân bằng giữa tốc độ và chất lượng.', N'["text", "reasoning", "vision"]', 1000000, 1, 0, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME());
    PRINT N'[Seed] Đã thêm mô hình: Gemini 2.5 Flash';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AIModels WHERE provider = 'groq' AND modelId = 'openai/gpt-oss-120b')
BEGIN
    INSERT INTO dbo.AIModels (provider, modelId, displayName, description, capabilities, contextLength, enabled, isDefault, priority, dailyTokenLimit, createdAt, updatedAt)
    VALUES ('groq', 'openai/gpt-oss-120b', N'GPT OSS 120B (Groq)', N'Mô hình Groq thuộc hạn mức Free hiện tại.', N'["text", "coding", "reasoning"]', 131072, 1, 0, 3, 0, SYSUTCDATETIME(), SYSUTCDATETIME());
    PRINT N'[Seed] Đã thêm mô hình: GPT OSS 120B (Groq)';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AIModels WHERE provider = 'groq' AND modelId = 'openai/gpt-oss-20b')
BEGIN
    INSERT INTO dbo.AIModels (provider, modelId, displayName, description, capabilities, contextLength, enabled, isDefault, priority, dailyTokenLimit, createdAt, updatedAt)
    VALUES ('groq', 'openai/gpt-oss-20b', N'GPT OSS 20B (Groq)', N'Mô hình Groq thuộc hạn mức Free hiện tại.', N'["text"]', 131072, 1, 0, 4, 0, SYSUTCDATETIME(), SYSUTCDATETIME());
    PRINT N'[Seed] Đã thêm mô hình: GPT OSS 20B (Groq)';
END
GO

-- 3. Thông báo về tài khoản Quản trị viên (Admin)
PRINT N'-----------------------------------------------------------------------------';
PRINT N'[Lưu ý] Tài khoản quản trị viên (Admin) được tạo an toàn qua lệnh backend:';
PRINT N'        cd backend && npm run seed';
PRINT N'        (Thông tin lấy từ ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD trong .env)';
PRINT N'-----------------------------------------------------------------------------';
GO
