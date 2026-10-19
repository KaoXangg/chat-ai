import { z } from "zod";

const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;

export const registerSchema = {
  body: z
    .object({
      username: z
        .string({ required_error: "Vui lòng nhập tên người dùng." })
        .trim()
        .min(1, "Tên người dùng phải có ít nhất 1 ký tự.")
        .max(32, "Tên người dùng không được vượt quá 32 ký tự."),
      email: z
        .string({ required_error: "Vui lòng nhập email." })
        .trim()
        .toLowerCase()
        .email("Email không đúng định dạng.")
        .max(255, "Email không được vượt quá 255 ký tự."),
      password: z
        .string({ required_error: "Vui lòng nhập mật khẩu." })
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
        .max(72, "Mật khẩu không được vượt quá 72 ký tự.")
        .regex(passwordRegex, "Mật khẩu phải chứa ít nhất một chữ cái và một chữ số."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const loginSchema = {
  body: z
    .object({
      email: z
        .string({ required_error: "Vui lòng nhập email." })
        .trim()
        .toLowerCase()
        .email("Email không đúng định dạng."),
      password: z
        .string({ required_error: "Vui lòng nhập mật khẩu." })
        .min(1, "Vui lòng nhập mật khẩu."),
      rememberMe: z.boolean().optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const forgotPasswordSchema = {
  body: z
    .object({
      email: z
        .string({ required_error: "Vui lòng nhập email." })
        .trim()
        .toLowerCase()
        .email("Email không đúng định dạng."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const resetPasswordSchema = {
  body: z
    .object({
      email: z
        .string({ required_error: "Vui lòng nhập email." })
        .trim()
        .toLowerCase()
        .email("Email không đúng định dạng."),
      otp: z
        .string({ required_error: "Vui lòng nhập mã OTP." })
        .trim()
        .regex(/^\d{6}$/, "Mã OTP phải gồm đúng 6 chữ số."),
      newPassword: z
        .string({ required_error: "Vui lòng nhập mật khẩu mới." })
        .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự.")
        .max(72, "Mật khẩu mới không được vượt quá 72 ký tự."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z
        .string({ required_error: "Vui lòng nhập mật khẩu hiện tại." })
        .min(1, "Vui lòng nhập mật khẩu hiện tại."),
      newPassword: z
        .string({ required_error: "Vui lòng nhập mật khẩu mới." })
        .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự.")
        .max(72, "Mật khẩu mới không được vượt quá 72 ký tự."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const updateProfileSchema = {
  body: z
    .object({
      username: z
        .string()
        .trim()
        .min(1, "Tên người dùng phải có ít nhất 1 ký tự.")
        .max(32, "Tên người dùng không được vượt quá 32 ký tự.")
        .optional(),
      avatar: z.string().max(500, "Đường dẫn ảnh đại diện quá dài.").optional(),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const verify2FASchema = {
  body: z
    .object({
      challengeToken: z
        .string({ required_error: "Thiếu challengeToken." })
        .min(1, "Thiếu challengeToken."),
      otp: z
        .string({ required_error: "Vui lòng nhập mã OTP." })
        .trim()
        .min(6, "Mã OTP phải có ít nhất 6 ký tự.")
        .max(10, "Mã OTP không hợp lệ."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};

export const resend2FASchema = {
  body: z
    .object({
      challengeToken: z
        .string({ required_error: "Thiếu challengeToken." })
        .min(1, "Thiếu challengeToken."),
    })
    .strict("Yêu cầu chứa trường không được phép."),
};
