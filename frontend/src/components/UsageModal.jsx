import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { X, RefreshCw, Gauge, Clock } from "lucide-react";
import { useModalA11y } from "../hooks/useModalA11y.js";

const nf = new Intl.NumberFormat("vi-VN");
const fmt = (n) => nf.format(Math.round(Number(n) || 0));

/** Màu thanh theo % còn lại: >50% xanh, 20–50% vàng, <20% đỏ. */
export function usageTone(percentRemaining) {
  if (percentRemaining === null || percentRemaining === undefined) return "ok";
  if (percentRemaining <= 20) return "danger";
  if (percentRemaining <= 50) return "warn";
  return "ok";
}

const BAR = { ok: "bg-ion-500", warn: "bg-amber-500", danger: "bg-red-500" };
export const TEXT_TONE = { ok: "text-ion-600 dark:text-ion-400", warn: "text-amber-600 dark:text-amber-400", danger: "text-red-500" };

/** % đã dùng chính xác (không làm tròn về 0 khi mới dùng ít): <10% hiện 1 số lẻ, còn lại làm tròn số nguyên. */
function usedPercent(m) {
  if (m.unlimited || !m.limit) return 0;
  return Math.min(100, (m.used / m.limit) * 100);
}
function formatPercent(p) {
  if (p <= 0) return "0";
  if (p < 0.1) return "<0,1";
  return p < 9.95 ? p.toFixed(1).replace(".", ",") : String(Math.round(p));
}

function formatCountdown(ms) {
  if (ms <= 0) return "sắp làm mới";
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
}

function formatResetAt(date) {
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function UsageModal({ open, onClose, usage, loading, error, onRefresh, current }) {
  const dialogRef = useModalA11y(open, onClose);
  const [now, setNow] = useState(() => Date.now());
  const refreshedForResetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [open]);

  const resetsAt = usage?.window?.resetsAt ? new Date(usage.window.resetsAt) : null;
  const msLeft = resetsAt ? resetsAt.getTime() - now : null;

  // Qua mốc reset khi đang mở -> tải lại số liệu mới (chỉ một lần cho mỗi mốc).
  useEffect(() => {
    if (!open || msLeft === null || msLeft > 0 || !resetsAt) return;
    const key = resetsAt.getTime();
    if (refreshedForResetRef.current === key) return;
    refreshedForResetRef.current = key;
    onRefresh?.();
  }, [open, msLeft, resetsAt, onRefresh]);

  const models = usage?.models || [];
  const isCurrent = (m) => current && m.provider === current.provider && m.modelId === current.model;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mức sử dụng token"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl glass border border-edge-light dark:border-edge-dark shadow-soft p-6 text-black dark:text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
                <Gauge size={18} className="text-brand-500" /> Mức sử dụng token
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  aria-label="Làm mới số liệu"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!usage ? (
              <div className="py-10 text-center text-sm opacity-60">{loading ? "Đang tải..." : error || "Không có dữ liệu."}</div>
            ) : (
              <>
                <div className="rounded-2xl border border-edge-light dark:border-edge-dark bg-black/[0.03] dark:bg-white/[0.04] p-4 mb-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-xs opacity-60">Đã dùng hôm nay (tất cả mô hình)</div>
                      <div className="font-display text-2xl font-semibold">{fmt(usage.totals.totalTokens)} <span className="text-sm font-normal opacity-60">token</span></div>
                    </div>
                    <div className="text-right text-xs opacity-60">
                      <div>{fmt(usage.totals.requests)} lượt trả lời</div>
                      <div>
                        {fmt(usage.totals.promptTokens)} vào · {fmt(usage.totals.completionTokens)} ra
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs">
                    <Clock size={13} className="text-brand-500 shrink-0" />
                    <span>
                      Làm mới sau <b>{formatCountdown(msLeft)}</b>
                      {resetsAt && <span className="opacity-60"> (lúc {formatResetAt(resetsAt)}, {usage.window.timezone})</span>}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {models.map((m) => {
                    const pUsed = usedPercent(m);
                    const pLeft = Math.max(0, 100 - pUsed);
                    const tone = usageTone(pLeft);
                    return (
                      <li
                        key={m._id}
                        className={clsx(
                          "rounded-2xl border p-3.5",
                          isCurrent(m) ? "border-brand-400/60 bg-brand-500/5" : "border-edge-light dark:border-edge-dark",
                          !m.available && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-sm font-medium">{m.displayName}</span>
                            <span className="ml-2 text-[11px] opacity-50 capitalize">{m.provider}</span>
                            {isCurrent(m) && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300">Đang chọn</span>}
                          </div>
                          {!m.unlimited && <span className={clsx("text-sm font-semibold shrink-0", TEXT_TONE[tone])}>Đã dùng {formatPercent(pUsed)}% / 100%</span>}
                        </div>

                        {m.unlimited ? (
                          <div className="mt-2 text-xs opacity-70">
                            Không giới hạn · đã dùng <b>{fmt(m.used)}</b> token · {fmt(m.requests)} lượt
                          </div>
                        ) : (
                          <>
                            <div
                              className="mt-2 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(pUsed)}
                              aria-label={`${m.displayName}: đã dùng ${formatPercent(pUsed)}%`}
                            >
                              <div className={clsx("h-full rounded-full transition-all", BAR[tone])} style={{ width: `${m.used > 0 ? Math.max(pUsed, 1.5) : 0}%` }} />
                            </div>
                            <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs opacity-70">
                              <span>
                                Đã dùng <b>{fmt(m.used)}</b> / {fmt(m.limit)} token
                              </span>
                              <span>
                                Còn lại <b>{fmt(m.remaining)}</b> token ({formatPercent(pLeft)}%)
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] opacity-50">
                              {fmt(m.promptTokens)} vào · {fmt(m.completionTokens)} ra · {fmt(m.requests)} lượt
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                  {models.length === 0 && <li className="text-sm text-center opacity-60 py-4">Chưa có mô hình nào.</li>}
                </ul>

                <p className="mt-4 text-[11px] opacity-50 leading-relaxed">
                  Hạn mức do hệ thống đặt cho từng mô hình và tính riêng cho tài khoản của bạn, làm mới lúc 00:00 mỗi ngày. Khi hết hạn mức của một mô hình,
                  hệ thống tự dùng mô hình khác còn lượt. Số token do nhà cung cấp AI báo về; nếu họ không báo, hệ thống ước lượng.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
