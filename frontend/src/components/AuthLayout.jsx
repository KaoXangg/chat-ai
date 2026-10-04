import { Reveal } from "./AuthMotion.jsx";

/**
 * Nội dung của MỘT trang xác thực (icon, tiêu đề, form, footer).
 * Khung ngoài (nền, khu thương hiệu, card, tab, chọn ngôn ngữ) nằm ở AuthShell và được giữ nguyên
 * khi chuyển trang; chỉ phần này được animate vào/ra.
 * `stateKey` (tuỳ chọn): đổi giá trị này để phần đầu (icon + tiêu đề) animate lại khi trang đổi bước (ví dụ gửi mã xong).
 * Chỉ số `i` của Reveal: 0 = icon, 1 = tiêu đề, trường form bắt đầu từ 2.
 */
export default function AuthLayout({ title, subtitle, iconBadge: IconBadge, children, footer, stateKey }) {
  return (
    <div>
      <div key={stateKey} className="mb-6 text-center lg:text-start">
        {IconBadge && (
          <Reveal i={0} pop>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20 mb-3.5 shadow-sm">
              <IconBadge size={22} className="stroke-[2.2]" />
            </div>
          </Reveal>
        )}
        <Reveal i={1}>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{subtitle}</p>
          )}
        </Reveal>
      </div>

      {children}

      {footer && (
        <Reveal i={8}>
          <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6 pt-5 border-t border-edge-light dark:border-edge-dark">
            {footer}
          </div>
        </Reveal>
      )}
    </div>
  );
}
