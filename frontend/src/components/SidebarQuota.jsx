import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Zap, Sparkles, Crown, ArrowUpRight, AlertTriangle, ShieldAlert } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import Tooltip from "./Tooltip.jsx";

const TIER_CONFIG = {
  free: {
    name: "Free",
    icon: Zap,
    color: "text-zinc-600 dark:text-zinc-300",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    border: "border-zinc-200 dark:border-zinc-700",
    barColor: "bg-zinc-500 dark:bg-zinc-400",
  },
  plus: {
    name: "Plus",
    icon: Sparkles,
    color: "text-brand-600 dark:text-brand-400",
    bg: "bg-brand-500/10",
    border: "border-brand-500/30",
    barColor: "bg-brand-500",
  },
  premium: {
    name: "Premium",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    barColor: "bg-gradient-to-r from-amber-500 to-amber-400",
  },
};

export default function SidebarQuota({ collapsed = false }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get("/usage");
      if (res.data.success && res.data.data.quota) {
        setQuota(res.data.data.quota);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuota();

    const handleUpdate = () => fetchQuota();
    window.addEventListener("quota-updated", handleUpdate);
    // Cập nhật định kỳ 60s
    const timer = setInterval(fetchQuota, 60000);

    return () => {
      window.removeEventListener("quota-updated", handleUpdate);
      clearInterval(timer);
    };
  }, [fetchQuota]);

  if (!user || loading || !quota) return null;

  const tierKey = quota.tier in TIER_CONFIG ? quota.tier : "free";
  const config = TIER_CONFIG[tierKey];
  const Icon = config.icon;

  const percent = quota.percentUsed || 0;
  const isWarning = quota.isWarning;
  const isExhausted = quota.isExhausted;

  // Thanh tiến trình đổi màu + micro-animation theo trạng thái
  // - < 80% : màu của gói, không animation
  // - ≥ 80% : amber + quota-pulse-warn (1.4s)
  // - 100%  : đỏ  + quota-pulse-exhausted (0.9s)
  const progressBarColor = isExhausted
    ? "bg-red-500 animate-quota-exhausted"
    : isWarning
    ? "bg-amber-500 animate-quota-warn"
    : config.barColor;

  const usedStr  = quota.usedToday.toLocaleString(lang);
  const limitStr = quota.dailyLimit.toLocaleString(lang);
  const ariaLabel = `Token hôm nay: đã dùng ${usedStr} / ${limitStr} (${percent}%)`;

  if (collapsed) {
    return (
      <Tooltip
        label={`Gói ${config.name}: ${quota.usedToday.toLocaleString(lang)} / ${quota.dailyLimit.toLocaleString(lang)} tokens (${percent}%)`}
        side="right"
      >
        <Link
          to="/pricing"
          aria-label={`Quota gói ${config.name}, ${percent}% đã dùng. Nhấn để xem bảng giá.`}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
          {isExhausted && (
            <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
          )}
          {isWarning && !isExhausted && (
            <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
          )}
        </Link>
      </Tooltip>
    );
  }

  return (
    <div className="px-3 py-1.5">
      <div className={`p-3 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/90 border ${config.border} shadow-2xs space-y-2.5 transition-all`}>
        {/* Tier Header & Action Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`p-1 rounded-md ${config.bg} ${config.color}`}>
              <Icon size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Gói {config.name}
            </span>
          </div>

          <Link
            to="/pricing"
            aria-label={`${quota.tier === "premium" ? "Xem bảng giá" : "Nâng cấp gói dịch vụ"}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <span>{quota.tier === "premium" ? "Bảng giá" : "Nâng cấp"}</span>
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium" id="quota-bar-label">Hạn mức hôm nay</span>
            <span
              className={`font-mono font-semibold tabular-nums transition-colors ${
                isExhausted
                  ? "text-red-500"
                  : isWarning
                  ? "text-amber-500"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {percent}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="quota-bar-label"
            aria-label={ariaLabel}
            className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${progressBarColor}`}
              style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
            />
          </div>
        </div>

        {/* Token Count and Status text */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span aria-live="polite">
            {quota.usedToday.toLocaleString(lang)}
            <span className="mx-0.5 text-zinc-300 dark:text-zinc-600">/</span>
            {quota.dailyLimit.toLocaleString(lang)}
          </span>
          {isExhausted ? (
            <span role="alert" aria-live="assertive" className="text-red-500 font-bold flex items-center gap-0.5">
              <ShieldAlert size={11} aria-hidden="true" /> Đã hết hạn mức
            </span>
          ) : isWarning ? (
            <span role="status" aria-live="polite" className="text-amber-500 font-semibold flex items-center gap-0.5">
              <AlertTriangle size={11} aria-hidden="true" /> Sắp hết
            </span>
          ) : (
            <span aria-label="Hạn mức reset lúc 00:00">Reset 00:00</span>
          )}
        </div>
      </div>
    </div>
  );
}
