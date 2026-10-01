-- Đặt hạn mức token mặc định (chỉ áp dụng cho model chưa có hạn mức)
SELECT DB_NAME() AS database_dang_dung, @@SERVERNAME AS may_chu;
GO

UPDATE dbo.AIModels
SET dailyTokenLimit = CASE LOWER(provider)
    WHEN 'gemini'     THEN 100000
    WHEN 'groq'       THEN 50000
    WHEN 'openrouter' THEN 30000
    ELSE 50000
END
WHERE dailyTokenLimit = 0;
GO

SELECT displayName, provider, modelId, dailyTokenLimit
FROM dbo.AIModels
ORDER BY priority;
GO