import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

const HEIGHT = 32; // h-8
const GAP = 8;

/**
 * Tooltip dạng viên thuốc dùng chung cho toàn app (thay cho thuộc tính `title` mặc định của trình duyệt).
 * Render qua portal nên không bị `overflow-hidden` của container cắt.
 *
 * <Tooltip label="Sao chép" side="bottom"><button>…</button></Tooltip>
 * <Tooltip label="Tìm kiếm" shortcut="Ctrl+K" side="right">…</Tooltip>
 *
 * side:  "bottom" (mặc định) | "top" | "right"
 * align: "center" (mặc định) | "start" | "end" — "start"/"end" canh mép trái/phải tooltip với mép trái/phải phần tử
 *        (dùng cho nút sát lề, hoặc tooltip dài)
 * className: class của thẻ bọc (mặc định "inline-flex"; dùng "flex w-full" nếu con là phần tử full-width)
 */
export default function Tooltip({ label, shortcut, side = "bottom", align = "center", className, children }) {
  const [tip, setTip] = useState(null);
  const timer = useRef(null);

  const show = (e) => {
    // Thiết bị cảm ứng không có hover → bỏ qua tooltip
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (side === "right") {
        setTip({ top: r.top + r.height / 2 - HEIGHT / 2, left: r.right + 10 });
      } else {
        setTip({
          top: side === "top" ? r.top - HEIGHT - GAP : r.bottom + GAP,
          left: align === "end" ? r.right : align === "start" ? r.left : r.left + r.width / 2,
        });
      }
    }, 200);
  };

  const hide = () => {
    clearTimeout(timer.current);
    setTip(null);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const shiftX = align === "end" ? "-100%" : align === "start" ? "0%" : "-50%";
  const enter = side === "right" ? { x: -4 } : { x: shiftX, y: side === "top" ? 4 : -4 };
  const rest = side === "right" ? { x: 0 } : { x: shiftX, y: 0 };

  return (
    <>
      <span
        className={className ?? "inline-flex"}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClickCapture={hide}
      >
        {children}
      </span>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {tip && (
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, ...enter }}
                animate={{ opacity: 1, ...rest }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ top: tip.top, left: tip.left }}
                className={clsx(
                  "fixed z-[200] h-8 flex items-center gap-2 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[13px] font-semibold whitespace-nowrap shadow-lg pointer-events-none",
                  shortcut ? "pl-3.5 pr-1.5" : "px-3.5"
                )}
              >
                {label}
                {shortcut && (
                  <span className="h-5 px-2 flex items-center rounded-full bg-white/20 dark:bg-black/10 text-[11px] font-medium text-white/80 dark:text-neutral-700">
                    {shortcut.split("+").map((k) => k.trim()).join(" + ")}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}