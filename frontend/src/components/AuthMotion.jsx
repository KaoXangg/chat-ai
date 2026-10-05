import { motion } from "framer-motion";

/** Đường cong dùng chung cho toàn bộ animation auth (ease-out mạnh, dứt khoát, không nảy). */
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN = [0.4, 0, 1, 1];

export const AUTH_ORDER = {
  "/login": 0,
  "/register": 1,
  "/forgot-password": 2,
  "/reset-password": 3,
};

const isRecovery = (path) => path === "/forgot-password" || path === "/reset-password";

/**
 * Xác định kiểu chuyển cảnh theo cặp trang:
 *  - forward / back : Đăng nhập <-> Đăng ký (slide ngang theo chiều điều hướng)
 *  - deepen         : Đăng nhập -> Quên/Đặt lại mật khẩu (card thu nhẹ, form mới fade-up)
 *  - surface        : Quên/Đặt lại mật khẩu -> Đăng nhập (quay về bước trước)
 *  - rise           : lần mở đầu tiên / từ ngoài khu vực auth (ví dụ đăng xuất)
 * Chiều Back/Forward của trình duyệt được suy ra từ chính cặp URL nên luôn đúng.
 */
export function getTransitionKind(from, to) {
  if (!from || from === to) return "rise";
  const a = AUTH_ORDER[from];
  const b = AUTH_ORDER[to];
  if (a === undefined || b === undefined) return "rise";
  if (isRecovery(to)) return "deepen";
  if (isRecovery(from)) return "surface";
  return b > a ? "forward" : "back";
}

const ENTER = {
  forward: { opacity: 0, x: 10 },
  back: { opacity: 0, x: -10 },
  deepen: { opacity: 0, y: 8 },
  surface: { opacity: 0, y: -8 },
  rise: { opacity: 0, y: 8 },
};

const EXIT = {
  forward: { opacity: 0, x: -8 },
  back: { opacity: 0, x: 8 },
  deepen: { opacity: 0, y: -8 },
  surface: { opacity: 0, y: 8 },
  rise: { opacity: 0 },
};

export const pageVariants = {
  enter: (kind) => ({
    ...(ENTER[kind] ?? ENTER.rise),
    transition: { duration: 0.2, ease: EASE },
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.2, ease: EASE },
  },
  exit: (kind) => ({
    ...(EXIT[kind] ?? EXIT.rise),
    transition: { duration: 0.14, ease: EASE_IN },
  }),
};

const STEP = 0.025;
const BASE = 0.02;
const MAX_INDEX = 6;

/**
 * Phần tử xuất hiện khi mount với độ trễ nhẹ theo thứ tự `i` (stagger tinh tế).
 * Hoạt động độc lập với cây variant nên dùng được ở mọi cấp.
 * Giữ thời lượng ngắn (0.22s) để UI phản hồi nhanh và mượt mà.
 */
export function Reveal({ i = 0, y = 6, pop = false, className, children }) {
  const delay = BASE + Math.min(i, MAX_INDEX) * STEP;
  return (
    <motion.div
      className={className}
      initial={pop ? { opacity: 0, scale: 0.92, y: 4 } : { opacity: 0, y }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        pop
          ? { type: "spring", stiffness: 420, damping: 28, delay }
          : { duration: 0.22, ease: EASE, delay }
      }
    >
      {children}
    </motion.div>
  );
}
