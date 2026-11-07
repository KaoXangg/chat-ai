import { z } from "zod";

export const upgradeTierSchema = {
  body: z
    .object({
      tier: z.enum(["free", "plus", "premium", "pro", "vip"], {
        required_error: "Vui lòng chọn gói dịch vụ cần nâng cấp.",
        invalid_type_error: "Gói dịch vụ không hợp lệ.",
      }),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
      note: z.string().max(500).optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};
