import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";
import BrandMark from "./BrandMark.jsx";

const PERKS = [
  { icon: Sparkles, text: "Nhiều mô hình AI: Gemini, Groq, OpenRouter" },
  { icon: Zap, text: "Phản hồi theo thời gian thực (streaming)" },
  { icon: ShieldCheck, text: "Dữ liệu trò chuyện được bảo mật riêng tư" },
];

const TABS = [
  { to: "/login", label: "Đăng nhập" },
  { to: "/register", label: "Đăng ký" },
];

function AuthTabs() {
  const location = useLocation();
  if (!TABS.some((t) => t.to === location.pathname)) return null;

  return (
    <div className="relative flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 mb-7">
      {TABS.map((tab) => {
        const active = location.pathname === tab.to;
        return (
          <Link key={tab.to} to={tab.to} className="relative flex-1 text-center py-2 text-sm font-medium z-10">
            {active && (
              <motion.span
                layoutId="auth-tab-pill"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-white dark:bg-white/10 shadow-soft -z-10"
              />
            )}
            <span className={active ? "text-black dark:text-white" : "opacity-50"}>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Shared shell for Login / Register / Forgot / Reset password pages.
 * Desktop: brand/illustration panel on the left, form panel on the right.
 * Mobile: form only, centered.
 * Purely presentational — carries no auth logic.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="h-screen w-full flex bg-surface-light dark:bg-surface-dark text-black dark:text-white relative overflow-hidden">
      <div className="aurora-bg" />

      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex w-[42%] max-w-[560px] relative z-10 flex-col justify-between p-12 border-r border-edge-light dark:border-edge-dark glass">
        <div className="flex items-center gap-2.5">
          <BrandMark size={36} />
          <span className="font-display font-semibold text-base tracking-tight">Chat AI</span>
        </div>

        <div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-3xl font-semibold tracking-tight leading-snug max-w-sm"
          >
            Trợ lý AI của riêng bạn, mọi lúc mọi nơi.
          </motion.h2>
          <p className="text-sm opacity-50 mt-3 max-w-sm">
            Trò chuyện, tìm kiếm và sáng tạo nhanh hơn với nhiều mô hình AI hàng đầu trong một giao diện duy nhất.
          </p>

          <div className="mt-8 space-y-3">
            {PERKS.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </span>
                <span className="opacity-70">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs opacity-30">© {new Date().getFullYear()} Chat AI. Đồ án minh họa.</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm glass border border-edge-light dark:border-edge-dark rounded-3xl p-7 sm:p-8 shadow-soft"
        >
          <div className="flex flex-col items-center mb-7 lg:hidden">
            <BrandMark size={48} className="mb-3 drop-shadow-lg" />
          </div>

          <div className="mb-7 text-center lg:text-left">
            <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm opacity-50 mt-1">{subtitle}</p>}
          </div>

          <AuthTabs />

          {children}

          {footer && <div className="text-center lg:text-left text-sm opacity-60 mt-5">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
