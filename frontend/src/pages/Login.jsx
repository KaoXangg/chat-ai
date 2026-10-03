import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, errorMessage } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/chat");
    } catch (err) {
      setError(errorMessage(err, "auth.login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="login-email" className="sr-only">
            {t("auth.login.email")}
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("auth.login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full ps-4 pe-4 py-2.5 rounded-2xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 focus:shadow-glow text-sm transition-all"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">
            {t("auth.login.password")}
          </label>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.login.password")}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="text-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">
            {t("auth.login.forgot")}
          </Link>
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
          {t("auth.login.submit")}
        </motion.button>
      </form>
    </AuthLayout>
  );
}