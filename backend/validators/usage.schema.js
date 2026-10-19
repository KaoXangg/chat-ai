import { z } from "zod";

export const upgradeTierSchema = {
  body: z
    .object({
      tier: z.enum(["free", "plus", "premium", "pro", "vip"], {
        required_error: "Vui lòng chọn gói dịch vụ cần nâng cấp.",
        invalid_type_error: "Gói dịch vụ không hợp lệ.",
      }),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};
