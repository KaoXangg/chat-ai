import { useState, useEffect } from "react";

let deferredPrompt = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Kiểm tra xem ứng dụng đã chạy ở chế độ standalone (đã cài đặt) chưa
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Kiểm tra thiết bị iOS (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isAppleDevice);

    if (isAppleDevice) {
      // iOS không hỗ trợ beforeinstallprompt, nhưng cho phép "Thêm vào MH chính"
      setCanInstall(true);
    }

    // Bắt sự kiện beforeinstallprompt trên Chromium (Chrome, Edge, Brave, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    // Bắt sự kiện khi người dùng đã cài đặt thành công
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setCanInstall(false);
      }
      deferredPrompt = null;
      return "prompted";
    }

    if (isIOS) {
      return "ios_guide";
    }

    return "unavailable";
  };

  return { canInstall: canInstall && !isInstalled, isInstalled, isIOS, promptInstall };
}
