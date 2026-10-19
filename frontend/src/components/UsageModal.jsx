import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import {
  X,
  RefreshCw,
  Gauge,
  Clock,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Bot,
  Info,
  Layers,
} from "lucide-react";
import { useModalA11y } from "../hooks/useModalA11y.js";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Hiển thị chuỗi dịch có thẻ <b>…</b> mà không dùng innerHTML */
function Rich({ text }) {
  return (
    <>
      {String(text)
        .split(/(<b>.*?<\/b>)/g)
        .map((part, i) => {
          const m = /^<b>(.*)<\/b>$/.exec(part);
          return m ? <b key={i} className="font-semibold">{m[1]}</b> : <span key={i}>{part}</span>;
        })}
    </>
  );
}

/** Màu thanh theo % còn lại: >50% xanh, 20–50% vàng, <=20% đỏ */
export function usageTone(percentRemaining) {
  if (percentRemaining === null || percentRemaining === undefined) return "ok";
  if (percentRemaining <= 20) return "danger";
  if (percentRemaining <= 50) return "warn";
  return "ok";
}

const BAR = {
  ok: "bg-emerald-500 dark:bg-emerald-400",
  warn: "bg-amber-500 dark:bg-amber-400",
  danger: "bg-rose-500 dark:bg-rose-400",
};

export const TEXT_TONE = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

const RING_COLOR = {
  ok: "stroke-emerald-500 dark:stroke-emerald-400 text-emerald-500 dark:text-emerald-400",
  warn: "stroke-amber-500 dark:stroke-amber-400 text-amber-500 dark:text-amber-400",
  danger: "stroke-rose-500 dark:stroke-rose-400 text-rose-500 dark:text-rose-400",
};

/** Hook đếm số có hiệu ứng count-up */
function useCountUp(target, duration = 500) {
  const [val, setVal] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const end = Math.round(Number(target) || 0);
    if (prefersReduced || duration <= 0) {
      setVal(end);
      return undefined;
    }
    let startTime = null;
    let frameId;
    const startVal = 0;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.round(startVal + (end - startVal) * ease));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, prefersReduced]);

  return val;
}

function usedPercent(m) {
  if (m.unlimited || !m.limit) return 0;
  return Math.min(100, (m.used / m.limit) * 100);
}

function formatPercent(p, nf1) {
  if (p <= 0) return "0";
  if (p < 0.1) return `<${nf1.format(0.1)}`;
  return p < 9.95 ? nf1.format(p) : String(Math.round(p));
}

function formatCountdown(ms, t) {
  if (ms === null || ms <= 0) return t("usage.soon");
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return t("usage.minutes", { m });
  return t("usage.hoursMinutes", { h, m });
}

function formatResetAt(date, lang) {
  return date.toLocaleString(lang, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function ProviderAvatar({ provider }) {
  const p = (provider || "ai").toLowerCase();
  const letter = p.charAt(0).toUpperCase();
  const colors = {
    openrouter: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
    openai: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    google: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    gemini: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    anthropic: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    groq: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
    deepseek: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  };
  const colorClass = colors[p] || "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
  return (
    <div className={clsx("w-6 h-6 rounded-md border flex items-center justify-center text-[11px] font-bold shrink-0", colorClass)}>
      {letter}
    </div>
  );
}

export default function UsageModal({ open, onClose, usage, loading, error, onRefresh, current }) {
  const { t, lang } = useI18n();
  const nf = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const nf1 = useMemo(() => new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), [lang]);
  const fmt = (n) => nf.format(Math.round(Number(n) || 0));
  const pct = (p) => formatPercent(p, nf1);
  const dialogRef = useModalA11y(open, onClose);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const refreshedForResetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [open]);

  const resetsAt = usage?.window?.resetsAt ? new Date(usage.window.resetsAt) : null;
  const msLeft = resetsAt ? resetsAt.getTime() - now : null;

  // Tự động tải lại khi mốc reset vừa qua
  useEffect(() => {
    if (!open || msLeft === null || msLeft > 0 || !resetsAt) return;
    const key = resetsAt.getTime();
    if (refreshedForResetRef.current === key) return;
    refreshedForResetRef.current = key;
    onRefresh?.();
  }, [open, msLeft, resetsAt, onRefresh]);

  const rawModels = usage?.models || [];
  const isCurrent = (m) => current && m.provider === current.provider && m.modelId === current.model;

  // Ghim mô hình đang chọn lên đầu danh sách
  const sortedModels = useMemo(() => {
    if (!rawModels.length) return [];
    if (!current) return rawModels;
    return [...rawModels].sort((a, b) => {
      const aCurr = isCurrent(a);
      const bCurr = isCurrent(b);
      if (aCurr && !bCurr) return -1;
      if (!aCurr && bCurr) return 1;
      return 0;
    });
  }, [rawModels, current]);

  const visibleModels = expanded ? sortedModels : sortedModels.slice(0, 3);
  const hasMoreModels = sortedModels.length > 3;

  // Tính % sử dụng tổng thể cho hero card
  const overallUsedPct = useMemo(() => {
    if (!usage?.quota?.dailyLimit) return null;
    return Math.min(100, Math.max(0, (usage.quota.usedToday / usage.quota.dailyLimit) * 100));
  }, [usage]);

  const overallRemainingPct = overallUsedPct !== null ? Math.max(0, 100 - overallUsedPct) : null;
  const overallTone = overallRemainingPct !== null ? usageTone(overallRemainingPct) : "ok";
  const isExhausted = usage?.quota?.isExhausted || (overallUsedPct !== null && overallUsedPct >= 100);
  const isNearExhausted = overallUsedPct !== null && overallUsedPct >= 95;

  // Count up animations
  const animatedTotalTokens = useCountUp(usage?.totals?.totalTokens || 0);
  const animatedPromptTokens = useCountUp(usage?.totals?.promptTokens || 0);
  const animatedCompletionTokens = useCountUp(usage?.totals?.completionTokens || 0);
  const animatedRequests = useCountUp(usage?.totals?.requests || 0);

  // SVG Ring calculation
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = overallUsedPct !== null
    ? ringCircumference - (ringCircumference * Math.min(100, overallUsedPct)) / 100
    : 0;

  const tierName = (usage?.quota?.tier || "Free").toUpperCase();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("usage.title")}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              "w-full max-w-lg overflow-y-auto shadow-2xl",
              // Nền đặc hoàn toàn không xuyên thấu (WCAG AA), không dùng kính/glass
              "bg-white dark:bg-[#12121a] text-zinc-900 dark:text-zinc-100",
              "border border-zinc-200 dark:border-zinc-800",
              // Desktop: bo góc lớn, padding chuẩn; Mobile: dạng bottom-sheet bám đáy
              "rounded-t-3xl md:rounded-3xl max-h-[90dvh] md:max-h-[88vh]",
              "p-5 md:p-6 pb-[max(20px,env(safe-area-inset-bottom))]"
            )}
          >
            {/* Drag Handle cho Mobile */}
            <div className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3 md:hidden" aria-hidden="true" />

            {/* Header Modal */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Gauge size={18} />
                </div>
                <div>
                  <h2 className="font-display text-base md:text-lg font-semibold tracking-tight">
                    {t("usage.title")}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="usage-refresh-btn"
                  onClick={onRefresh}
                  disabled={loading}
                  aria-label={t("usage.refresh")}
                  title={t("usage.refresh")}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  title={t("common.close")}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Trạng thái lỗi hoặc tải */}
            {!usage && loading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-brand-500 mx-auto" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("usage.loading")}</p>
              </div>
            ) : !usage && error ? (
              <div className="py-12 text-center space-y-4 px-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">{error}</p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                >
                  <RefreshCw size={14} /> {t("usage.retry")}
                </button>
              </div>
            ) : !usage ? (
              <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("usage.noData")}
              </div>
            ) : (
              <>
                {/* Banner cảnh báo khi hết quota hoặc gần hết */}
                {(isExhausted || isNearExhausted) && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                      "mb-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs",
                      isExhausted
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle size={16} className={clsx("shrink-0", isExhausted && "animate-pulse")} />
                      <span className="font-medium truncate">
                        {isExhausted ? t("usage.exhaustedBanner") : t("usage.warningBanner")}
                      </span>
                    </div>
                    <Link
                      to="/pricing"
                      onClick={onClose}
                      data-testid="usage-upgrade-btn"
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-[11px] hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      {t("usage.upgrade")} <ArrowUpRight size={12} />
                    </Link>
                  </motion.div>
                )}

                {/* Hero Card: Ring SVG + Count Up + In/Out + Tier + Countdown */}
                <div
                  data-testid="usage-hero"
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 mb-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {t("usage.todayAll")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/15 text-brand-600 dark:text-brand-300">
                          {t("usage.tier", { tier: tierName })}
                        </span>
                      </div>

                      <div className="font-display text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-baseline gap-1.5">
                        <span>{fmt(animatedTotalTokens)}</span>
                        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {t("usage.tokenUnit")}
                        </span>
                      </div>

                      {/* Phân bổ Vào / Ra / Lượt */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{t("usage.responses", { n: fmt(animatedRequests) })}</span>
                        <span>•</span>
                        <span>{t("usage.inOut", { inn: fmt(animatedPromptTokens), out: fmt(animatedCompletionTokens) })}</span>
                      </div>
                    </div>

                    {/* Circular Progress Ring */}
                    {overallUsedPct !== null && (
                      <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                          <circle
                            cx="36"
                            cy="36"
                            r={ringRadius}
                            className="stroke-zinc-200 dark:stroke-zinc-800 fill-none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="36"
                            cy="36"
                            r={ringRadius}
                            className={clsx("fill-none transition-all duration-700 ease-out", RING_COLOR[overallTone].split(" ")[0])}
                            strokeWidth="6"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className={clsx("font-display text-sm font-bold leading-none", TEXT_TONE[overallTone])}>
                            {Math.round(overallUsedPct)}%
                          </span>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            used
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Đồng hồ đếm ngược reset (00:00 GMT+7) */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock size={13} className="text-brand-500 shrink-0" />
                    <span className="truncate">
                      {msLeft !== null && msLeft > 0 ? (
                        <Rich text={t("usage.resetsIn", { time: formatCountdown(msLeft, t) })} />
                      ) : (
                        <b>{formatCountdown(msLeft, t)}</b>
                      )}
                      {resetsAt && (
                        <span className="opacity-70 ms-1">
                          {t("usage.resetsAt", { at: formatResetAt(resetsAt, lang), tz: usage.window?.timezone || "GMT+7" })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Danh sách các mô hình */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Mô hình AI
                    </span>
                    {hasMoreModels && (
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                      >
                        {expanded ? t("usage.collapse") : t("usage.seeAll", { n: sortedModels.length })}
                        <ChevronDown size={13} className={clsx("transition-transform duration-200", expanded && "rotate-180")} />
                      </button>
                    )}
                  </div>

                  <ul className="space-y-2.5">
                    {visibleModels.map((m, idx) => {
                      const pUsed = usedPercent(m);
                      const pLeft = Math.max(0, 100 - pUsed);
                      const tone = usageTone(pLeft);
                      const currentSelected = isCurrent(m);
                      const isHighUsed = pUsed >= 95;

                      return (
                        <motion.li
                          key={m._id || `${m.provider}-${m.modelId}`}
                          data-testid="usage-model-card"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: idx * 0.04 }}
                          className={clsx(
                            "rounded-2xl border p-3.5 transition-colors",
                            currentSelected
                              ? "border-brand-500/50 bg-brand-500/5 dark:bg-brand-500/[0.07]"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30",
                            !m.available && "opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ProviderAvatar provider={m.provider} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {m.displayName}
                                  </span>
                                  {currentSelected && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300">
                                      {t("usage.current")}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-400 capitalize">
                                  {m.provider}
                                </span>
                              </div>
                            </div>

                            {!m.unlimited && (
                              <span className={clsx("text-xs font-bold shrink-0", TEXT_TONE[tone], isHighUsed && "animate-pulse")}>
                                {t("usage.usedPct", { pct: pct(pUsed) })}
                              </span>
                            )}
                          </div>

                          {m.unlimited ? (
                            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <Rich text={t("usage.unlimited", { used: fmt(m.used), requests: fmt(m.requests) })} />
                            </div>
                          ) : (
                            <>
                              {/* Thanh progress với màu theo ngưỡng */}
                              <div
                                className="mt-2.5 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(pUsed)}
                                aria-label={t("usage.barLabel", { name: m.displayName, pct: pct(pUsed) })}
                              >
                                <div
                                  className={clsx("h-full rounded-full transition-all duration-500", BAR[tone], isHighUsed && "animate-pulse")}
                                  style={{ width: `${m.used > 0 ? Math.max(pUsed, 2) : 0}%` }}
                                />
                              </div>

                              <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-zinc-600 dark:text-zinc-400">
                                <span>
                                  <Rich text={t("usage.usedOf", { used: fmt(m.used), limit: fmt(m.limit) })} />
                                </span>
                                <span>
                                  <Rich text={t("usage.remaining", { left: fmt(m.remaining), pct: pct(pLeft) })} />
                                </span>
                              </div>

                              <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                                {t("usage.breakdown", { inn: fmt(m.promptTokens), out: fmt(m.completionTokens), req: fmt(m.requests) })}
                              </div>
                            </>
                          )}
                        </motion.li>
                      );
                    })}

                    {sortedModels.length === 0 && (
                      <li className="text-sm text-center text-zinc-400 py-6">
                        {t("usage.noModels")}
                      </li>
                    )}
                  </ul>
                </div>

                {/* 3 Dòng ghi chú thông tin minh bạch */}
                <div className="mt-4 pt-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-start gap-2">
                    <Clock size={13} className="text-brand-500 shrink-0 mt-0.5" />
                    <span>{t("usage.noteLimit")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bot size={13} className="text-brand-500 shrink-0 mt-0.5" />
                    <span>{t("usage.noteFallback")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={13} className="text-brand-500 shrink-0 mt-0.5" />
                    <span>{t("usage.noteEst")}</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}