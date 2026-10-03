import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../api/axios.js";
import AuthLayout from "../components/AuthLayout.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t, errorMessage } = useI18n();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setMessage(t("auth.forgot.sent"));
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 1200);
    } catch (err) {
      setError(errorMessage(err, "auth.forgot.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={
        <>
          {t("auth.forgot.remembered")}{" "}
          <Link to="/login" className="text-brand-500 font-medium hover:underline">
            {t("auth.forgot.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder={t("auth.forgot.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full ps-4 pe-4 py-2.5 rounded-2xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 focus:shadow-glow text-sm transition-all"
        />

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
          {message && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="status"
              className="flex items-center gap-1.5 text-sm text-ion-500"
            >
              <CheckCircle2 size={14} className="shrink-0" /> {message}
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
          {t("auth.forgot.submit")}
        </motion.button>
      </form>
    </AuthLayout>
  );
}