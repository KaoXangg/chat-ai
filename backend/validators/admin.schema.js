import { z } from "zod";

const sqlIdSchema = z.coerce
  .number({ invalid_type_error: "Mã định danh phải là số." })
  .int("Mã định danh phải là số nguyên.")
  .positive("Mã định danh phải là số nguyên dương.")
  .max(2147483647, "Mã định danh vượt quá giới hạn cho phép.");

export const idParamSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
};

export const listUsersQuerySchema = {
  query: z.object({
    search: z.string().max(255, "Từ khóa tìm kiếm quá dài.").optional().nullable().or(z.literal("")),
    role: z.enum(["user", "admin"]).optional().nullable().or(z.literal("")),
    status: z.enum(["active", "banned"]).optional().nullable().or(z.literal("")),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

export const updateUserSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
  body: z
    .object({
      status: z.enum(["active", "banned"], {
        invalid_type_error: "Trạng thái chỉ có thể là active hoặc banned.",
      }).optional(),
      role: z.enum(["user", "admin"], {
        invalid_type_error: "Vai trò chỉ có thể là user hoặc admin.",
      }).optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const updateUserQuotaSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
  body: z
    .object({
      customDailyTokenLimit: z
        .union([
          z.coerce.number().int().min(0, "Hạn ngạch token phải là số không âm."),
          z.null(),
          z.literal(""),
        ])
        .optional(),
      userTier: z.enum(["free", "plus", "premium", "pro", "vip"], {
        invalid_type_error: "Gói dịch vụ không hợp lệ.",
      }).optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const listSessionsQuerySchema = {
  query: z.object({
    search: z.string().max(255).optional().nullable().or(z.literal("")),
    deviceType: z.enum(["desktop", "mobile", "tablet"]).optional().nullable().or(z.literal("")),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

export const listPaginationQuerySchema = {
  query: z.object({
    search: z.string().max(255).optional().nullable().or(z.literal("")),
    action: z.string().max(100).optional().nullable().or(z.literal("")),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

export const createModelSchema = {
  body: z
    .object({
      displayName: z.string().trim().min(1).max(150).optional(),
      name: z.string().trim().min(1).max(150).optional(),
      provider: z.enum(["gemini", "groq", "openrouter"], {
        required_error: "Nhà cung cấp là bắt buộc.",
      }),
      modelId: z.string().trim().min(1, "Mã model là bắt buộc.").max(150),
      description: z.string().max(500).optional().nullable(),
      enabled: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      priority: z.coerce.number().int().optional(),
      contextLength: z.coerce.number().int().optional(),
      inputCostPer1k: z.coerce.number().optional(),
      outputCostPer1k: z.coerce.number().optional(),
      dailyTokenLimit: z.coerce.number().int().optional(),
      capabilities: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .passthrough()
    .refine((data) => Boolean(data.displayName || data.name), {
      message: "Tên hiển thị là bắt buộc.",
      path: ["displayName"],
    }),
};

export const updateModelSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
  body: z
    .object({
      displayName: z.string().trim().min(1).max(150).optional(),
      name: z.string().trim().min(1).max(150).optional(),
      provider: z.enum(["gemini", "groq", "openrouter"]).optional(),
      modelId: z.string().trim().min(1).max(150).optional(),
      description: z.string().max(500).optional().nullable(),
      enabled: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      priority: z.coerce.number().int().optional(),
      contextLength: z.coerce.number().int().optional(),
      inputCostPer1k: z.coerce.number().optional(),
      outputCostPer1k: z.coerce.number().optional(),
      dailyTokenLimit: z.coerce.number().int().optional(),
      capabilities: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .passthrough(),
};

export const updateSettingsSchema = {
  body: z
    .object({
      allowRegistration: z.boolean().optional(),
      maintenanceMode: z.boolean().optional(),
      maintenanceMessage: z.string().max(500).optional(),
      globalSystemPrompt: z.string().max(4000).optional(),
      defaultUserDailyTokens: z.coerce.number().int().min(0).max(10_000_000).optional(),
      rateLimitPerMinute: z.coerce.number().int().min(1).max(1000).optional(),
      geminiApiKey: z.string().optional(),
      groqApiKey: z.string().optional(),
      openrouterApiKey: z.string().optional(),
      tavilyApiKey: z.string().optional(),
      blockedKeywords: z.string().optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const createPersonaSchema = {
  body: z
    .object({
      name: z.string().trim().min(1, "Tên trợ lý là bắt buộc.").max(100),
      role: z.string().trim().min(1, "Vai trò là bắt buộc.").max(150),
      description: z.string().max(500).optional().nullable(),
      systemPrompt: z.string().trim().min(1, "System prompt là bắt buộc.").max(4000),
      avatar: z.string().max(100).optional(),
      category: z.string().max(50).optional(),
      suggestedPrompts: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const updatePersonaSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      role: z.string().trim().min(1).max(150).optional(),
      description: z.string().max(500).optional().nullable(),
      systemPrompt: z.string().trim().min(1).max(4000).optional(),
      avatar: z.string().max(100).optional(),
      category: z.string().max(50).optional(),
      suggestedPrompts: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const createAnnouncementSchema = {
  body: z
    .object({
      title: z.string().trim().min(1, "Tiêu đề thông báo là bắt buộc.").max(200),
      content: z.string().trim().min(1, "Nội dung thông báo là bắt buộc.").max(2000),
      type: z.enum(["info", "warning", "success", "promo"]).optional(),
      active: z.boolean().optional(),
      dismissible: z.boolean().optional(),
      startsAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional()),
      expiresAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional()),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const updateAnnouncementSchema = {
  params: z.object({
    id: sqlIdSchema,
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      content: z.string().trim().min(1).max(2000).optional(),
      type: z.enum(["info", "warning", "success", "promo"]).optional(),
      active: z.boolean().optional(),
      dismissible: z.boolean().optional(),
      startsAt: z.string().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};
