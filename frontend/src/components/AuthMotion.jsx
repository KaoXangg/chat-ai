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
  if (from === "/login" && isRecovery(to)) return "deepen";
  if (isRecovery(from) && to === "/login") return "surface";
  return b > a ? "forward" : "back";
}

const ENTER = {
  forward: { opacity: 0, x: 28, scale: 0.985 },
  back: { opacity: 0, x: -28, scale: 0.985 },
  deepen: { opacity: 0, y: 18 },
  surface: { opacity: 0, scale: 0.975 },
  rise: { opacity: 0, y: 12 },
};

const EXIT = {
  forward: { opacity: 0, x: -22, scale: 0.99 },
  back: { opacity: 0, x: 22, scale: 0.99 },
  deepen: { opacity: 0, scale: 0.965, y: -6 },
  surface: { opacity: 0, y: 8 },
  rise: { opacity: 0 },
};

export const pageVariants = {
  enter: (kind) => ENTER[kind] ?? ENTER.rise,
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: EASE },
  },
  exit: (kind) => ({
    ...(EXIT[kind] ?? EXIT.rise),
    transition: { duration: 0.17, ease: EASE_IN },
  }),
};

const STEP = 0.035;
const BASE = 0.05;
const MAX_INDEX = 7;

/**
 * Phần tử xuất hiện khi mount với độ trễ nhỏ theo thứ tự `i` (stagger).
 * Hoạt động độc lập với cây variant nên dùng được ở mọi cấp và trong AnimatePresence con.
 * Người dùng bật "giảm chuyển động": MotionConfig tự bỏ dịch chuyển/scale, chỉ còn fade.
 */
export function Reveal({ i = 0, y = 8, pop = false, className, children }) {
  const delay = BASE + Math.min(i, MAX_INDEX) * STEP;
  return (
    <motion.div
      className={className}
      initial={pop ? { opacity: 0, scale: 0.84, y: 6 } : { opacity: 0, y }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        pop
          ? { type: "spring", stiffness: 380, damping: 26, delay }
          : { duration: 0.3, ease: EASE, delay }
      }
    >
      {children}
    </motion.div>
  );
}
