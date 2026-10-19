import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare, Smartphone, Laptop, CheckCircle2 } from "lucide-react";
import BrandMark from "./BrandMark.jsx";

export default function InstallAppModal({ open, onClose, isIOS, onInstallNow }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <BrandMark size={44} />
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Cài đặt ứng dụng Chat AI</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Trải nghiệm mượt mà như app gốc</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2.5 mb-6 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Chạy toàn màn hình không dính thanh địa chỉ trình duyệt</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Mở tức thì từ Màn hình chính (Desktop / Mobile)</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Tải nhanh hơn và tiết kiệm dữ liệu di động</span>
            </div>
          </div>

          {/* iOS Instructions */}
          {isIOS ? (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-zinc-700 dark:text-zinc-300 space-y-3 mb-4">
              <p className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Smartphone size={15} />
                Hướng dẫn cài đặt trên iPhone / iPad (Safari):
              </p>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span>1. Nhấn nút <strong>Chia sẻ</strong></span>
                  <span className="inline-flex p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                    <Share size={13} className="text-blue-500" />
                  </span>
                  <span>ở thanh dưới Safari</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>2. Cuộn xuống chọn <strong>Thêm vào MH chính</strong></span>
                  <span className="inline-flex p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                    <PlusSquare size={13} className="text-indigo-500" />
                  </span>
                </li>
                <li>3. Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất!</li>
              </ol>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-3">
            {!isIOS && (
              <button
                onClick={async () => {
                  await onInstallNow();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download size={15} />
                Cài đặt ngay
              </button>
            )}
            <button
              onClick={onClose}
              className={`py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors ${
                isIOS ? "w-full bg-indigo-600 hover:bg-indigo-500 text-white border-transparent" : ""
              }`}
            >
              {isIOS ? "Đã hiểu" : "Để sau"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
