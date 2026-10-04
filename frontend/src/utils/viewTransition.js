import { flushSync } from "react-dom";

/**
 * Chạy `update` (thay đổi state React) bên trong View Transition của trình duyệt để toàn trang
 * cross-fade mượt thay vì nhấp nháy khi đổi ngôn ngữ. Trình duyệt không hỗ trợ hoặc người dùng
 * bật "giảm chuyển động" -> chạy thẳng, không hiệu ứng.
 */
export function withViewTransition(update) {
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (reduce || typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    update();
    return;
  }

  try {
    document.startViewTransition(() => {
      flushSync(update);
    });
  } catch {
    update();
  }
}
