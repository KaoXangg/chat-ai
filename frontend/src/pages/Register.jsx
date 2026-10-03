import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

function passwordScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4, purely a UI hint, never blocks submission
}

const STRENGTH_COLOR = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-ion-500", "bg-ion-500"];

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t, errorMessage } = useI18n();
  const navigate = useNavigate();

  const score = passwordScore(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/chat");
    } catch (err) {
      setError(errorMessage(err, "auth.register.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <input
          required
          minLength={3}
          autoComplete="username"
          placeholder={t("auth.register.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 focus:shadow-glow text-sm transition-all"
        />
        <input
          type="email"
          required
          autoComplete="email"
          placeholder={t("auth.register.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 focus:shadow-glow text-sm transition-all"
        />

        <div>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.register.password")}
            required
            minLength={6}
            autoComplete="new-password"
          />
          {password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "flex-1 h-full rounded-full transition-colors",
                      i < score ? STRENGTH_COLOR[score] : "bg-transparent"
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] opacity-50 w-16 text-end shrink-0">{t(`auth.register.strength${score}`)}</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="flex items-center gap-1.5 text-sm text-red-500"
            >
              <AlertCircle size={14} className="shrink-0" /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-glow disabled:opacity-60 text-white text-sm font-medium transition-all"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {t("auth.register.submit")}
        </motion.button>
      </form>
    </AuthLayout>
  );
}