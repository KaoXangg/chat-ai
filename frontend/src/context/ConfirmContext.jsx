import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useModalA11y } from "../hooks/useModalA11y.js";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, danger, resolve }

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        title: options.title || "Xác nhận",
        message: options.message || "",
        confirmLabel: options.confirmLabel || "Xác nhận",
        cancelLabel: options.cancelLabel || "Hủy",
        danger: Boolean(options.danger),
        resolve,
      });
    });
  }, []);

  const handle = (value) => {
    state?.resolve(value);
    setState(null);
  };

  const dialogRef = useModalA11y(Boolean(state), () => handle(false));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => handle(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl glass border border-edge-light dark:border-edge-dark shadow-soft p-6"
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${
                  state.danger ? "bg-red-500/10 text-red-500" : "bg-brand-500/10 text-brand-500"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <h2 id="confirm-title" className="font-display text-lg font-semibold tracking-tight mb-1.5">
                {state.title}
              </h2>
              <p className="text-sm opacity-60 leading-relaxed">{state.message}</p>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => handle(false)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-edge-light dark:border-edge-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {state.cancelLabel}
                </button>
                <button
                  autoFocus
                  onClick={() => handle(true)}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-medium text-white transition-all ${
                    state.danger
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_8px_30px_-8px_rgba(239,68,68,0.55)]"
                      : "bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-glow"
                  }`}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm phải được dùng bên trong ConfirmProvider");
  return ctx;
}