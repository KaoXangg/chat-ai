/**
 * Đăng ký Service Worker cho Progressive Web App (PWA)
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Kiểm tra xem có phiên bản mới cập nhật không
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // Đã có phiên bản mới trong cache
                console.info("[PWA] Ứng dụng đã có bản cập nhật mới.");
              } else {
                console.info("[PWA] Ứng dụng đã sẵn sàng chạy offline!");
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn("[PWA] Lỗi đăng ký Service Worker:", error);
      });
  });
}
