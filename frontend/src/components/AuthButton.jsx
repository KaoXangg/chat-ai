import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import clsx from "clsx";

/**
 * Nút của trang xác thực.
 * - loading / success: nút bị khoá bằng aria-disabled (không mất focus) và chặn click => không gửi trùng request.
 * - error: nền chuyển đỏ mềm kèm icon.
 * - Kích thước cố định; chỗ đặt icon tự mở ra/đóng lại nên chữ không bị giật.
 * Lớp màu thành công/lỗi là overlay đổi opacity vì `background-image` (gradient) không nội suy được.
 */
export default function AuthButton({
  children,
  type = "submit",
  loading = false,
  success = false,
  error = false,
  disabled = false,
  variant = "primary",
  icon: Icon,
  className = "",
  onClick,
  ...props
}) {
  const isPrimary = variant === "primary";
  const locked = loading || success;

  let slot = null;
  if (loading) slot = <Loader2 size={16} className="animate-spin" />;
  else if (success) slot = <Check size={16} className="stroke-[3]" />;
  else if (error && isPrimary) slot = <AlertCircle size={16} />;
  else if (Icon) slot = <Icon size={16} />;

  const slotKey = loading ? "loading" : success ? "success" : error && isPrimary ? "error" : Icon ? "icon" : "none";

  const handleClick = (e) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || locked ? 1 : 0.98 }}
      transition={{ duration: 0.12 }}
      type={type}
      disabled={disabled}
      aria-disabled={locked || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={clsx(
        "relative w-full h-[42px] overflow-hidden flex items-center justify-center gap-2 px-4 rounded-2xl text-sm font-medium tracking-wide outline-none select-none",
        "transition-[filter,box-shadow,background-color,border-color,opacity] duration-200",
        "focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        isPrimary && [
          "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/20 border-t border-white/20",
          !locked && !disabled && "hover:brightness-110 hover:shadow-lg hover:shadow-brand-500/30",
          "disabled:opacity-60 disabled:pointer-events-none disabled:shadow-none",
          locked && "cursor-default",
        ],
        variant === "secondary" && [
          "border border-edge-light dark:border-edge-dark bg-white/70 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200",
          !locked && !disabled && "hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-zinc-700",
          "disabled:opacity-50 disabled:pointer-events-none",
          locked && "cursor-default",
        ],
        className
      )}
      {...props}
    >
      {isPrimary && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-600 transition-opacity duration-300"
            style={{ opacity: success ? 1 : 0 }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-600 transition-opacity duration-300"
            style={{ opacity: error && !success && !loading ? 1 : 0 }}
          />
        </>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {slot && (
          <motion.span
            key={slotKey}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.14 }}
            className="relative flex shrink-0"
          >
            {slot}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="relative">{children}</span>
    </motion.button>
  );
}
