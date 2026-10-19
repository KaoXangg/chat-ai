-- =============================================================================
-- Migration Script: Thêm các chỉ mục composite tối ưu hiệu năng truy vấn cho SQL Server
-- Áp dụng cho: TokenUsages (userId, createdAt), Conversations (userId, createdAt), Messages (conversationId, createdAt)
-- =============================================================================

-- 1. Index cho bảng TokenUsages (hỗ trợ tính toán token quota hôm nay)
IF OBJECT_ID('dbo.TokenUsages', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TokenUsages_userId_createdAt' AND object_id = OBJECT_ID('dbo.TokenUsages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TokenUsages_userId_createdAt 
        ON dbo.TokenUsages (userId ASC, createdAt ASC)
        INCLUDE (totalTokens, promptTokens, completionTokens, provider, modelId);
        PRINT 'Đã tạo chỉ mục IX_TokenUsages_userId_createdAt thành công.';
    END
    ELSE
    BEGIN
        PRINT 'Chỉ mục IX_TokenUsages_userId_createdAt đã tồn tại.';
    END
END
GO

-- 2. Index cho bảng Conversations (hỗ trợ lọc danh sách cuộc trò chuyện theo người dùng sắp xếp theo thời gian)
IF OBJECT_ID('dbo.Conversations', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Conversations_userId_createdAt' AND object_id = OBJECT_ID('dbo.Conversations'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Conversations_userId_createdAt 
        ON dbo.Conversations (userId ASC, createdAt DESC);
        PRINT 'Đã tạo chỉ mục IX_Conversations_userId_createdAt thành công.';
    END
    ELSE
    BEGIN
        PRINT 'Chỉ mục IX_Conversations_userId_createdAt đã tồn tại.';
    END
END
GO

-- 3. Index cho bảng Messages (hỗ trợ load lịch sử tin nhắn trong cuộc trò chuyện)
IF OBJECT_ID('dbo.Messages', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Messages_conversationId_createdAt' AND object_id = OBJECT_ID('dbo.Messages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Messages_conversationId_createdAt 
        ON dbo.Messages (conversationId ASC, createdAt ASC);
        PRINT 'Đã tạo chỉ mục IX_Messages_conversationId_createdAt thành công.';
    END
    ELSE
    BEGIN
        PRINT 'Chỉ mục IX_Messages_conversationId_createdAt đã tồn tại.';
    END
END
GO
