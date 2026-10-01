import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";
import clsx from "clsx";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const TONE = {
  success: "text-ion-500 border-ion-500/20 bg-ion-500/10",
  error: "text-red-500 border-red-500/20 bg-red-500/10",
  warning: "text-amber-500 border-amber-500/20 bg-amber-500/10",
  info: "text-brand-500 border-brand-500/20 bg-brand-500/10",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    show: push,
    success: (msg, opts) => push(msg, { ...opts, type: "success" }),
    error: (msg, opts) => push(msg, { ...opts, type: "error" }),
    warning: (msg, opts) => push(msg, { ...opts, type: "warning" }),
    info: (msg, opts) => push(msg, { ...opts, type: "info" }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                role="status"
                className={clsx(
                  "pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl border glass shadow-soft backdrop-blur-xl",
                  TONE[t.type]
                )}
              >
                <Icon size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm flex-1 text-black dark:text-white leading-snug">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Đóng thông báo"
                  className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được dùng bên trong ToastProvider");
  return ctx;
}

/** Extracts a friendly message from an axios error, matching the app's error response shape. */
export function apiErrorMessage(err, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  return err?.response?.data?.error?.message || fallback;
}
