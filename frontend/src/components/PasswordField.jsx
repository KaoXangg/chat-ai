import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function PasswordField({ value, onChange, placeholder, required, minLength, autoComplete }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full ps-4 pe-11 py-2.5 rounded-2xl border border-edge-light dark:border-edge-dark bg-white/50 dark:bg-white/5 outline-none focus:border-brand-400 focus:shadow-glow text-sm transition-all"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.password.hide") : t("auth.password.show")}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute end-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center opacity-50 hover:opacity-90 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}