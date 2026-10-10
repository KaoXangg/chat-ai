import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function ThemeToggle({ className = "", size = "md", variant = "compact" }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  const isDark = theme === "dark";
  const label = isDark ? t("sidebar.toLight") : t("sidebar.toDark");

  if (variant === "segmented") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={t("sidebar.darkMode")}
        title={label}
        onClick={toggleTheme}
        className={clsx("theme-switch", className)}
      >
        <span className="theme-switch-label">{isDark ? t("sidebar.darkMode") : t("sidebar.lightMode")}</span>
        <span className="theme-switch-track" aria-hidden="true">
          <span className={clsx("theme-switch-option", !isDark && "is-selected")}><Sun size={16} /></span>
          <span className={clsx("theme-switch-option", isDark && "is-selected")}><Moon size={16} /></span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      data-size={size}
      className={clsx(
        "theme-toggle relative inline-flex items-center justify-center shrink-0 rounded-xl",
        "h-10 w-10 sm:h-10 sm:w-10",
        "border border-zinc-200/80 dark:border-zinc-800/80",
        "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md",
        "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
        "hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
        "shadow-xs transition-[background-color,color,border-color,box-shadow,transform] duration-150",
        "outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95",
        className
      )}
    >
      <Sun size={17} aria-hidden="true" className={clsx("theme-toggle-icon text-amber-600", isDark && "is-hidden")} />
      <Moon size={17} aria-hidden="true" className={clsx("theme-toggle-icon text-brand-300", !isDark && "is-hidden")} />
    </button>
  );
}
