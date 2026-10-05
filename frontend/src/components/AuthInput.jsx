import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { EASE } from "./AuthMotion.jsx";

/**
 * Ô nhập cho các trang xác thực.
 * - `disabled` được hiểu là "đang khoá" (readOnly): giữ nguyên focus + giá trị khi form đang gửi request.
 * - Lỗi: viền chuyển đỏ mượt, thông báo trượt xuống, trường lỗi rung nhẹ một lần.
 * - Mật khẩu: đổi icon hiện/ẩn bằng cross-fade, giữ focus và vị trí con trỏ.
 */
const AuthInput = forwardRef(function AuthInput(
  {
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    error,
    helperText,
    icon: Icon,
    required = false,
    autoComplete,
    disabled = false,
    className = "",
    action,
    isPassword = false,
    ...props
  },
  ref
) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef(null);
  const selectionRef = useRef(null);
  const nudge = useAnimationControls();
  const [showPassword, setShowPassword] = useState(false);

  useImperativeHandle(ref, () => inputRef.current);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // Cảnh báo ngắn trên đúng trường bị lỗi (không rung cả form).
  useEffect(() => {
    if (!error || reduceMotion) return;
    nudge.start({ x: [0, -4, 4, -3, 2, 0], transition: { duration: 0.3, ease: "easeOut" } });
  }, [error, reduceMotion, nudge]);

  // Khôi phục focus + vị trí con trỏ sau khi đổi type password <-> text.
  useLayoutEffect(() => {
    const saved = selectionRef.current;
    const el = inputRef.current;
    if (!saved || !el) return;
    selectionRef.current = null;
    el.focus({ preventScroll: true });
    try {
      el.setSelectionRange(saved.start, saved.end);
    } catch {
      /* một số type không hỗ trợ selection */
    }
  }, [showPassword]);

  const togglePassword = () => {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      selectionRef.current = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
    }
    setShowPassword((v) => !v);
  };

  return (
    <div className={clsx("group w-full space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs font-medium">
          <label
            htmlFor={id}
            className="text-zinc-700 dark:text-zinc-300 select-none transition-colors duration-150 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400"
          >
            {label}
            {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
          </label>
          {action && <div className="text-xs">{action}</div>}
        </div>
      )}

      <motion.div
        animate={nudge}
        className={clsx(
          "relative flex items-center rounded-xl",
          "h-[38px] sm:h-10",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          "border bg-white dark:bg-zinc-900/60 backdrop-blur-sm",
          error
            ? "border-red-500/80 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.14)]",
          disabled && "opacity-70 bg-zinc-50 dark:bg-zinc-900/40"
        )}
      >
        {Icon && (
          <span
            className={clsx(
              "ps-3 pe-1 pointer-events-none shrink-0 transition-colors duration-150",
              error
                ? "text-red-500"
                : "text-zinc-400 dark:text-zinc-500 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400"
            )}
          >
            <Icon size={15} />
          </span>
        )}

        <input
          ref={inputRef}
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          readOnly={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            "w-full h-full bg-transparent text-[13.5px] text-zinc-900 dark:text-zinc-100 outline-none leading-normal",
            "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 placeholder:transition-opacity placeholder:duration-150 focus:placeholder:opacity-50",
            disabled && "cursor-not-allowed",
            Icon ? "ps-1.5" : "ps-3",
            isPassword ? "pe-9" : "pe-3"
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            // Giữ focus trong input khi bấm nút (không blur, con trỏ không nhảy).
            onMouseDown={(e) => e.preventDefault()}
            onClick={togglePassword}
            aria-label={showPassword ? t("auth.password.hide") : t("auth.password.show")}
            aria-pressed={showPassword}
            className="absolute end-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={showPassword ? "hide" : "show"}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                className="flex"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </motion.div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 pt-0.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!error && helperText && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 ps-0.5">{helperText}</p>
      )}
    </div>
  );
});

export default AuthInput;
