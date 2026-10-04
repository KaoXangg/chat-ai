import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, KeyRound, Mail, MailCheck, RefreshCw } from "lucide-react";
import api from "../api/axios.js";
import { useAuthEmail } from "../context/AuthDraftContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthInput from "../components/AuthInput.jsx";
import AuthButton from "../components/AuthButton.jsx";
import FormAlert from "../components/FormAlert.jsx";
import { Reveal } from "../components/AuthMotion.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

// Chỉ có animation thoát: phần vào do Reveal của từng phần tử đảm nhiệm (tránh fade chồng fade).
const swapExit = { opacity: 0, y: -6, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } };

export default function ForgotPassword() {
  const [email, setEmail] = useAuthEmail();
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const submittingRef = useRef(false);

  const navigate = useNavigate();
  const { t, errorMessage } = useI18n();

  const validate = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t("auth.validation.emailRequired"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t("auth.validation.emailInvalid"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submittingRef.current) return;
    setFormError("");

    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setIsSent(true);
    } catch (err) {
      setFormError(errorMessage(err, "auth.forgot.failed"));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleProceedToReset = () => {
    navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <AuthLayout
      stateKey={isSent ? "sent" : "form"}
      title={isSent ? t("auth.forgot.sentTitle") : t("auth.forgot.title")}
      subtitle={isSent ? undefined : t("auth.forgot.subtitle")}
      iconBadge={isSent ? MailCheck : KeyRound}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t("auth.forgot.backToLogin")}</span>
        </Link>
      }
    >
      <AnimatePresence mode="wait">
        {isSent ? (
          <motion.div key="success-sent" exit={swapExit} className="space-y-5">
            <Reveal i={2}>
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <p className="font-semibold text-brand-600 dark:text-brand-400 text-sm mb-1">{t("auth.forgot.sent")}</p>
                <p className="opacity-80">{t("auth.forgot.sentDesc")}</p>
                <p className="mt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 break-all bg-white/60 dark:bg-black/20 p-2 rounded-xl">
                  {email.trim()}
                </p>
              </div>
            </Reveal>

            <div className="space-y-2.5">
              <Reveal i={3}>
                <AuthButton type="button" onClick={handleProceedToReset} icon={ArrowRight}>
                  {t("auth.forgot.proceedToReset")}
                </AuthButton>
              </Reveal>

              <Reveal i={4}>
                <AuthButton
                  type="button"
                  variant="secondary"
                  loading={loading}
                  onClick={handleSubmit}
                  icon={RefreshCw}
                >
                  {t("auth.forgot.resend")}
                </AuthButton>
              </Reveal>
            </div>

            <FormAlert message={formError} />
          </motion.div>
        ) : (
          <motion.form key="form-input" exit={swapExit} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Reveal i={2}>
              <AuthInput
                id="forgot-email"
                label={t("auth.forgot.email")}
                type="email"
                required
                autoComplete="email"
                icon={Mail}
                placeholder={t("auth.forgot.emailPlaceholder")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                  if (formError) setFormError("");
                }}
                error={emailError}
                disabled={loading}
              />
            </Reveal>

            <FormAlert message={formError} />

            <Reveal i={3}>
              <AuthButton type="submit" loading={loading} error={Boolean(formError)}>
                {loading ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
              </AuthButton>
            </Reveal>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
