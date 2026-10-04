import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";

/** Checkbox tuỳ biến: có focus ring khi dùng bàn phím, ô tick chuyển trạng thái mềm. */
export default function AuthCheckbox({ checked, onChange, disabled = false, invalid = false, className = "", children }) {
  return (
    <label className={clsx("flex items-start gap-2.5 cursor-pointer select-none group", disabled && "opacity-70", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={clsx(
          "relative mt-0.5 w-4 h-4 shrink-0 rounded-md border flex items-center justify-center",
          "transition-[background-color,border-color,box-shadow] duration-200",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-transparent",
          checked
            ? "bg-brand-500 border-brand-500 text-white shadow-sm"
            : invalid
            ? "border-red-500 bg-red-500/10"
            : "border-zinc-300 dark:border-zinc-600 bg-white/60 dark:bg-white/5 group-hover:border-brand-400"
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span
              key="tick"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="flex"
            >
              <Check size={11} className="stroke-[3]" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="text-xs text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors leading-relaxed">
        {children}
      </span>
    </label>
  );
}
