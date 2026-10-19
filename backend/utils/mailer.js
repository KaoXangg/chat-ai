import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendOtpEmail(to, otp) {
  const t = getTransporter();
  if (!t) throw new Error("Chưa cấu hình SMTP để gửi email.");

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Mã xác nhận đặt lại mật khẩu - Chat AI",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Đặt lại mật khẩu</h2>
      <p>Mã xác nhận (OTP) của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
      <p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    </div>`,
  });
}

export async function send2faOtpEmail(to, otp) {
  const t = getTransporter();
  if (!t) throw new Error("Chưa cấu hình SMTP để gửi email.");

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Mã xác thực đăng nhập 2 bước (2FA) - Chat AI",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 22px; font-weight: 700;">Chat AI Security</h1>
      </div>
      <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 10px;">Xác thực đăng nhập Quản trị viên</h2>
      <p style="color: #52525b; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">Tài khoản Quản trị viên của bạn vừa được đăng nhập. Để đảm bảo an toàn, vui lòng sử dụng mã xác thực bảo mật 2 lớp (2FA) dưới đây:</p>
      <div style="background: #f4f4f5; border-radius: 12px; padding: 16px 20px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
      </div>
      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 0 0 6px;">• Mã xác thực có hiệu lực trong <strong>5 phút</strong>.</p>
      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">• Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 18px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu ngay lập tức.</p>
    </div>`,
  });
}