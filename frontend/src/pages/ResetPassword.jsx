import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Key, Lock, Mail } from "lucide-react";
import api from "../api/axios.js";
import { useAuthEmail } from "../context/AuthDraftContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthInput from "../components/AuthInput.jsx";
import AuthButton from "../components/AuthButton.jsx";
import FormAlert from "../components/FormAlert.jsx";
import { Reveal } from "../components/AuthMotion.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useAuthEmail();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const submittingRef = useRef(false);

  const navigate = useNavigate();
  const { t, errorMessage } = useI18n();
  const locked = loading || isSuccess;

  // Email từ liên kết (?email=...) được ưu tiên hơn email đang nhập ở trang trước.
  useLayoutEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) setEmail(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearError = (key) => {
    if (fieldErrors[key]) setFieldErrors((p) => ({ ...p, [key]: "" }));
    if (formError) setFormError("");
  };

  const validate = () => {
    const next = {};
    if (!email.trim()) {
      next.email = t("auth.validation.emailRequired");
    }
    if (!otp.trim()) {
      next.otp = t("auth.validation.required");
    } else if (otp.trim().length !== 6) {
      next.otp = t("error.INVALID_OTP");
    }
    if (!newPassword) {
      next.newPassword = t("auth.validation.passwordRequired");
    } else if (newPassword.length < 6) {
      next.newPassword = t("auth.validation.passwordMin");
    }
    if (!confirmPassword) {
      next.confirmPassword = t("auth.validation.passwordRequired");
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = t("auth.reset.mismatch");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setFormError("");

    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setIsSuccess(true);
      // Quay về đăng nhập ngay, trang đăng nhập hiển thị thông báo thành công (không dùng setTimeout).
      navigate("/login", { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setFormError(errorMessage(err, "auth.reset.failed"));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.subtitle")}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t("auth.reset.back")}</span>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3" noValidate>
        <Reveal i={2}>
          <AuthInput
            id="reset-email"
            label={t("auth.reset.email")}
            type="email"
            required
            autoComplete="email"
            icon={Mail}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            error={fieldErrors.email}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={3}>
          <AuthInput
            id="reset-otp"
            label={t("auth.reset.otp")}
            required
            inputMode="numeric"
            maxLength={6}
            icon={Key}
            placeholder={t("auth.reset.otpPlaceholder")}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              clearError("otp");
            }}
            error={fieldErrors.otp}
            disabled={locked}
            className="tracking-widest font-mono"
          />
        </Reveal>

        <Reveal i={4}>
          <AuthInput
            id="reset-new-password"
            label={t("auth.reset.newPassword")}
            isPassword
            required
            autoComplete="new-password"
            icon={Lock}
            placeholder={t("auth.reset.newPasswordPlaceholder")}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              clearError("newPassword");
            }}
            error={fieldErrors.newPassword}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={5}>
          <AuthInput
            id="reset-confirm-password"
            label={t("auth.reset.confirmPassword")}
            isPassword
            required
            autoComplete="new-password"
            icon={Lock}
            placeholder={t("auth.reset.confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError("confirmPassword");
            }}
            error={fieldErrors.confirmPassword}
            disabled={locked}
          />
        </Reveal>

        <FormAlert message={formError} />

        <Reveal i={6}>
          <AuthButton type="submit" loading={loading} success={isSuccess} error={Boolean(formError)}>
            {loading ? t("auth.reset.submitting") : t("auth.reset.submit")}
          </AuthButton>
        </Reveal>
      </form>
    </AuthLayout>
  );
}
