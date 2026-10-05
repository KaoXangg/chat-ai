import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { REMEMBER_EMAIL_KEY, REMEMBER_ME_KEY, useAuthEmail } from "../context/AuthDraftContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthInput from "../components/AuthInput.jsx";
import AuthButton from "../components/AuthButton.jsx";
import AuthCheckbox from "../components/AuthCheckbox.jsx";
import FormAlert from "../components/FormAlert.jsx";
import { Reveal } from "../components/AuthMotion.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function Login() {
  const [email, setEmail] = useAuthEmail();
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const submittingRef = useRef(false);

  const { login } = useAuth();
  const { t, errorMessage } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = Boolean(location.state?.resetSuccess);
  const locked = loading || isSuccess;

  const validate = () => {
    const next = {};
    const trimmed = email.trim();

    if (!trimmed) {
      next.email = t("auth.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      next.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      next.password = t("auth.validation.passwordRequired");
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Khoá đồng bộ: chặn gửi trùng ngay cả khi state `loading` chưa kịp render.
    if (submittingRef.current) return;
    setFormError("");

    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
          localStorage.setItem(REMEMBER_ME_KEY, "true");
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {
        /* localStorage không khả dụng: bỏ qua */
      }

      await login(email.trim(), password);
      setIsSuccess(true);
      // Điều hướng ngay; hiệu ứng chuyển khu vực do App đảm nhiệm (không giả lập bằng setTimeout).
      navigate("/chat", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "auth.login.failed"));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          <span>{t("auth.login.noAccount")}</span>{" "}
          <Link
            to="/register"
            className="text-brand-600 dark:text-brand-400 font-semibold hover:underline ms-1 inline-flex items-center gap-0.5"
          >
            {t("auth.login.registerLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {resetSuccess && (
          <Reveal i={1}>
            <FormAlert tone="success" message={t("auth.reset.success")} />
          </Reveal>
        )}

        <Reveal i={2}>
          <AuthInput
            id="login-email"
            label={t("auth.login.email")}
            type="email"
            required
            autoComplete="email"
            icon={Mail}
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
              if (formError) setFormError("");
            }}
            error={fieldErrors.email}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={3}>
          <AuthInput
            id="login-password"
            label={t("auth.login.password")}
            isPassword
            required
            autoComplete="current-password"
            icon={Lock}
            placeholder={t("auth.login.passwordPlaceholder")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
              if (formError) setFormError("");
            }}
            error={fieldErrors.password}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={4}>
          <div className="flex items-center justify-between pt-0.5">
            <AuthCheckbox id="login-remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={locked}>
              {t("auth.login.remember")}
            </AuthCheckbox>

            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline transition-colors"
            >
              {t("auth.login.forgot")}
            </Link>
          </div>
        </Reveal>

        <FormAlert message={formError} />

        <Reveal i={5}>
          <AuthButton type="submit" loading={loading} success={isSuccess} error={Boolean(formError)}>
            {loading ? t("auth.login.submitting") : t("auth.login.submit")}
          </AuthButton>
        </Reveal>
      </form>
    </AuthLayout>
  );
}
