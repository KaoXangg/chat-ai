import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { EASE } from "./AuthMotion.jsx";

/**
 * Banner lỗi/thành công cấp form. Chiều cao và khoảng cách được animate cùng nhau
 * nên khi biến mất không để lại khoảng trắng và không làm layout nhảy.
 */
export default function FormAlert({ message, tone = "error" }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="form-alert"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="!mt-0 overflow-hidden"
        >
          <div
            role={isError ? "alert" : "status"}
            className={clsx(
              "mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2",
              isError
                ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            )}
          >
            <Icon size={15} className="shrink-0" />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
