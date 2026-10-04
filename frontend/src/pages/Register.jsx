import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Mail, Lock, User, UserPlus } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAuthEmail } from "../context/AuthDraftContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthInput from "../components/AuthInput.jsx";
import AuthButton from "../components/AuthButton.jsx";
import AuthCheckbox from "../components/AuthCheckbox.jsx";
import FormAlert from "../components/FormAlert.jsx";
import { EASE, Reveal } from "../components/AuthMotion.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

function computePasswordScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_STYLES = [
  { bar: "bg-red-500", label: "text-red-500" },
  { bar: "bg-orange-500", label: "text-orange-500" },
  { bar: "bg-amber-400", label: "text-amber-500" },
  { bar: "bg-emerald-500", label: "text-emerald-500" },
  { bar: "bg-brand-500", label: "text-brand-500" },
];

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useAuthEmail();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const submittingRef = useRef(false);

  const { register } = useAuth();
  const { t, errorMessage } = useI18n();
  const navigate = useNavigate();

  const score = computePasswordScore(password);
  const locked = loading || isSuccess;

  const clearError = (key) => {
    if (fieldErrors[key]) setFieldErrors((p) => ({ ...p, [key]: "" }));
    if (formError) setFormError("");
  };

  const validate = () => {
    const next = {};
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUser) {
      next.username = t("auth.validation.usernameRequired");
    } else if (trimmedUser.length < 3) {
      next.username = t("auth.validation.usernameMin");
    }

    if (!trimmedEmail) {
      next.email = t("auth.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      next.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      next.password = t("auth.validation.passwordMin");
    }

    if (!confirmPassword) {
      next.confirmPassword = t("auth.validation.passwordRequired");
    } else if (confirmPassword !== password) {
      next.confirmPassword = t("auth.reset.mismatch");
    }

    if (!agreeTerms) {
      next.terms = t("auth.register.termsRequired");
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
      await register(username.trim(), email.trim(), password);
      setIsSuccess(true);
      navigate("/chat", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "auth.register.failed"));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      iconBadge={UserPlus}
      footer={
        <>
          <span>{t("auth.register.hasAccount")}</span>{" "}
          <Link
            to="/login"
            className="text-brand-600 dark:text-brand-400 font-semibold hover:underline ms-1 inline-flex items-center gap-0.5"
          >
            {t("auth.register.loginLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <Reveal i={2}>
          <AuthInput
            id="register-username"
            label={t("auth.register.username")}
            required
            autoComplete="name"
            icon={User}
            placeholder={t("auth.register.usernamePlaceholder")}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearError("username");
            }}
            error={fieldErrors.username}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={3}>
          <AuthInput
            id="register-email"
            label={t("auth.register.email")}
            type="email"
            required
            autoComplete="email"
            icon={Mail}
            placeholder={t("auth.register.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            error={fieldErrors.email}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={4}>
          <AuthInput
            id="register-password"
            label={t("auth.register.password")}
            isPassword
            required
            autoComplete="new-password"
            icon={Lock}
            placeholder={t("auth.register.passwordPlaceholder")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            error={fieldErrors.password}
            disabled={locked}
          />

          {/* Password strength meter: mở ra/đóng lại bằng chiều cao, không làm form nhảy */}
          <AnimatePresence initial={false}>
            {password && (
              <motion.div
                key="strength"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-2 px-1">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-zinc-500 dark:text-zinc-400">{t("auth.register.strengthLabel")}</span>
                    <span className={clsx("font-medium transition-colors duration-200", STRENGTH_STYLES[score]?.label)}>
                      {t(`auth.register.strength${score}`)}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1.5 w-full bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={clsx(
                          "flex-1 h-full rounded-full transition-[background-color,opacity] duration-300",
                          step <= score ? STRENGTH_STYLES[score]?.bar : "bg-transparent"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>

        <Reveal i={5}>
          <AuthInput
            id="register-confirm-password"
            label={t("auth.register.confirmPassword")}
            isPassword
            required
            autoComplete="new-password"
            icon={Lock}
            placeholder={t("auth.register.confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError("confirmPassword");
            }}
            error={fieldErrors.confirmPassword}
            disabled={locked}
          />
        </Reveal>

        <Reveal i={6}>
          <div className="pt-1">
            <AuthCheckbox
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                clearError("terms");
              }}
              disabled={locked}
              invalid={Boolean(fieldErrors.terms)}
            >
              {t("auth.register.termsAgree")}{" "}
              <span className="text-brand-600 dark:text-brand-400 font-medium underline-offset-2 hover:underline">
                {t("auth.register.termsService")}
              </span>{" "}
              {t("auth.register.and")}{" "}
              <span className="text-brand-600 dark:text-brand-400 font-medium underline-offset-2 hover:underline">
                {t("auth.register.privacy")}
              </span>
              .
            </AuthCheckbox>

            <AnimatePresence initial={false}>
              {fieldErrors.terms && (
                <motion.div
                  key="terms-error"
                  role="alert"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="flex items-center gap-1.5 text-xs text-red-500 pt-1 ps-6">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{fieldErrors.terms}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        <FormAlert message={formError} />

        <Reveal i={7}>
          <AuthButton type="submit" loading={loading} success={isSuccess} error={Boolean(formError)}>
            {loading ? t("auth.register.submitting") : t("auth.register.submit")}
          </AuthButton>
        </Reveal>
      </form>
    </AuthLayout>
  );
}
