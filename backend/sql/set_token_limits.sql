-- Đặt hạn mức token / người dùng / ngày cho từng nhà cung cấp.
-- Mức khởi điểm thận trọng (chưa dựa trên quota thật của nhà cung cấp) - chỉnh lại trong Admin -> Mô hình AI khi đã biết quota thật.
-- Chạy trong SSMS với ĐÚNG database mà backend đang dùng (DB_NAME trong backend/.env).

-- 0. Cho biết đang chạy trên database nào
SELECT DB_NAME() AS database_dang_dung, @@SERVERNAME AS may_chu;
GO

-- 1. Thêm cột nếu database này chưa có (backend cũng tự làm việc này khi khởi động)
IF COL_LENGTH('dbo.AIModels', 'dailyTokenLimit') IS NULL
    ALTER TABLE dbo.AIModels ADD dailyTokenLimit INT NOT NULL CONSTRAINT DF_AIModels_dailyTokenLimit DEFAULT (0);
GO

-- 2. Đặt hạn mức theo nhà cung cấp
UPDATE dbo.AIModels
SET dailyTokenLimit = CASE LOWER(provider)
    WHEN 'gemini'     THEN 100000
    WHEN 'groq'       THEN 50000
    WHEN 'openrouter' THEN 30000
    ELSE 50000
END;
GO

-- 3. Kiểm tra kết quả
SELECT displayName, provider, modelId, dailyTokenLimit
FROM dbo.AIModels
ORDER BY priority;
GO
