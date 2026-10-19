import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, ShieldCheck, ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { REMEMBER_EMAIL_KEY, REMEMBER_ME_KEY, useAuthEmail } from "../context/AuthDraftContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import FormAlert from "../components/FormAlert.jsx";
import { Reveal } from "../components/AuthMotion.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

// Google, Apple, Facebook SVG Icons (Clean & Scalable)
function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.93-.93.04-2.03.63-2.69 1.41-.58.68-1.09 1.77-.95 2.82 1.04.08 2.07-.52 2.7-1.3z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useAuthEmail();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    } catch {
      return false;
    }
  });

  // 2FA State
  const [step, setStep] = useState("credentials"); // "credentials" | "2fa"
  const [challengeToken, setChallengeToken] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const submittingRef = useRef(false);

  const { login, verify2FA, resend2FA } = useAuth();
  const { t, errorMessage } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = Boolean(location.state?.resetSuccess);
  const locked = loading || isSuccess;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validate = () => {
    const next = {};
    const trimmed = email.trim();

    if (!trimmed) {
      next.email = t("auth.validation.emailRequired");
    } else if (!isEmailValid) {
      next.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      next.password = t("auth.validation.passwordRequired");
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
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

      const result = await login(email.trim(), password, rememberMe);

      if (result?.require2FA) {
        setChallengeToken(result.challengeToken);
        setEmailMasked(result.emailMasked);
        setDevOtp(result.devOtp || "");
        setStep("2fa");
        setResendCooldown(60);
        submittingRef.current = false;
        setLoading(false);
        return;
      }

      setIsSuccess(true);
      navigate("/chat", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "auth.login.failed"));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setFormError("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setFieldErrors({ otp: "Vui lòng nhập đủ 6 chữ số OTP." });
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const user = await verify2FA(challengeToken, cleanOtp);
      setIsSuccess(true);
      const target = user?.role === "admin" ? "/admin" : "/chat";
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "error.INVALID_OTP"));
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setFormError("");
    try {
      const res = await resend2FA(challengeToken);
      setResendCooldown(60);
      if (res?.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
    } catch (err) {
      setFormError(errorMessage(err, "error.RATE_LIMITED"));
    } finally {
      setResending(false);
    }
  };

  const handleSocialClick = (name) => {
    toast?.info?.(t("auth.login.socialComingSoon"));
  };

  // 2FA STEP
  if (step === "2fa") {
    return (
      <div className="w-full space-y-4">
        <div className="text-center space-y-2 mb-4">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-500/10 text-[#0066fe] dark:text-blue-400 mb-1 shadow-2xs">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {t("auth.2fa.title")}
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
            {t("auth.2fa.subtitle", { email: emailMasked || email })}
          </p>
        </div>

        <form onSubmit={handle2FASubmit} className="space-y-4" noValidate>
          {devOtp && (
            <div className="p-3 rounded-2xl text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-2.5">
              <Sparkles size={16} className="shrink-0 text-amber-500" />
              <span>{t("auth.2fa.devHint", { otp: devOtp })}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-otp" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {t("auth.2fa.otpLabel")}
            </label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              placeholder={t("auth.2fa.otpPlaceholder")}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
                if (fieldErrors.otp) setFieldErrors({});
                if (formError) setFormError("");
              }}
              disabled={locked}
              className="w-full text-center text-2xl font-mono font-bold tracking-[0.4em] py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#0066fe] transition-all"
            />
            {fieldErrors.otp && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.otp}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-zinc-400">Không nhận được mã?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || resending || locked}
              className="font-medium text-[#0066fe] dark:text-blue-400 hover:underline disabled:opacity-50 inline-flex items-center gap-1 transition-colors"
            >
              {resending && <RefreshCw size={12} className="animate-spin" />}
              {resendCooldown > 0
                ? t("auth.2fa.resendCooldown", { sec: resendCooldown })
                : t("auth.2fa.resend")}
            </button>
          </div>

          <FormAlert message={formError} />

          <button
            type="submit"
            disabled={locked}
            className="w-full py-3.5 rounded-2xl bg-[#0066fe] hover:bg-[#0055d4] active:scale-[0.99] text-white font-semibold text-sm shadow-[0_8px_20px_-4px_rgba(0,102,254,0.4)] transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer"
          >
            {loading ? t("auth.2fa.submitting") : t("auth.2fa.submit")}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setFormError("");
                setFieldErrors({});
                setOtp("");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              {t("auth.2fa.backToLogin")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STANDARD LOGIN (MATCHING REFERENCE IMAGE)
  return (
    <div className="w-full">
      {/* Title & Subtitle from Reference Image */}
      <div className="text-center mb-5">
        <h1 className="text-2xl sm:text-[28px] font-bold text-zinc-900 dark:text-white tracking-tight">
          {t("auth.login.title")}
        </h1>
        <p className="text-xs sm:text-[13px] text-zinc-400 dark:text-zinc-500 mt-1">
          {t("auth.login.enterDetails")}
        </p>
      </div>

      {/* Pill Segmented Tabs (Sign In / Signup) */}
      <div className="w-full max-w-[280px] mx-auto p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center mb-6">
        <div className="flex-1 text-center py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs">
          {t("auth.layout.tabLogin")}
        </div>
        <Link
          to="/register"
          className="flex-1 text-center py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          {t("auth.layout.tabRegister")}
        </Link>
      </div>

      <form onSubmit={handleCredentialsSubmit} className="space-y-3.5" noValidate>
        {resetSuccess && (
          <Reveal i={1}>
            <FormAlert tone="success" message={t("auth.reset.success")} />
          </Reveal>
        )}

        {/* Email Input Card (Stacked Layout matching Reference Image) */}
        <div className="space-y-1">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-2.5 sm:p-3 flex items-center gap-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-[#0066fe] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-500 shrink-0">
              <Mail size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="login-email" className="block text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider leading-none mb-1">
                {t("auth.login.email")}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("auth.login.emailPlaceholder")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                  if (formError) setFormError("");
                }}
                disabled={locked}
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 placeholder:font-normal leading-normal"
              />
            </div>
            {isEmailValid && (
              <div className="shrink-0 text-emerald-500 me-1">
                <CheckCircle2 size={18} className="fill-emerald-500/15" />
              </div>
            )}
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] text-red-500 ps-2">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password Input Card (Stacked Layout matching Reference Image) */}
        <div className="space-y-1">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-2.5 sm:p-3 flex items-center gap-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-[#0066fe] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-500 shrink-0">
              <Lock size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="login-password" className="block text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider leading-none mb-1">
                {t("auth.login.password")}
              </label>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder={t("auth.login.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  if (formError) setFormError("");
                }}
                disabled={locked}
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 placeholder:font-normal leading-normal"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-red-500 ps-2">{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={locked}
              className="w-4 h-4 rounded-md border-zinc-300 dark:border-zinc-700 text-[#0066fe] focus:ring-[#0066fe]/20"
            />
            <span>{t("auth.login.remember")}</span>
          </label>

          <Link
            to="/forgot-password"
            className="font-medium text-[#0066fe] dark:text-blue-400 hover:underline transition-colors"
          >
            {t("auth.login.forgot")}
          </Link>
        </div>

        <FormAlert message={formError} />

        {/* Continue Primary Button (Big Blue Pill from Reference Image) */}
        <button
          type="submit"
          disabled={locked}
          className="w-full py-3.5 sm:py-3.5 rounded-2xl bg-[#0066fe] hover:bg-[#0055d4] active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-[0_10px_25px_-5px_rgba(0,102,254,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>{t("auth.login.submitting")}</span>
            </>
          ) : (
            <span>{t("auth.login.continue")}</span>
          )}
        </button>

        {/* Divider: Or Continue With */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800" />
          </div>
          <span className="relative px-3 text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-[#12131b] uppercase tracking-wider font-medium">
            {t("auth.login.orContinueWith")}
          </span>
        </div>

        {/* Social Round Buttons Row from Reference Image */}
        <div className="flex items-center justify-center gap-3.5 pt-1">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleSocialClick("google")}
            className="w-11 h-11 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Continue with Google"
          >
            <GoogleIcon />
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleSocialClick("apple")}
            className="w-11 h-11 rounded-full bg-black hover:bg-zinc-800 text-white shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Continue with Apple"
          >
            <AppleIcon />
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleSocialClick("facebook")}
            className="w-11 h-11 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Continue with Facebook"
          >
            <FacebookIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
