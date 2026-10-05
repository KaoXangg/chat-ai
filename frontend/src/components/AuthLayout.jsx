import clsx from "clsx";
import { Reveal } from "./AuthMotion.jsx";

/**
 * Nội dung của MỘT trang xác thực (icon, tiêu đề, form, footer).
 * Khung ngoài (nền, khu thương hiệu, card, tab, chọn ngôn ngữ) nằm ở AuthShell và được giữ nguyên
 * khi chuyển trang; chỉ phần này được animate vào/ra.
 * `stateKey` (tuỳ chọn): đổi giá trị này để phần đầu (icon + tiêu đề) animate lại khi trang đổi bước (ví dụ gửi mã xong).
 * Chỉ số `i` của Reveal: 0 = icon, 1 = tiêu đề, trường form bắt đầu từ 2.
 */
export default function AuthLayout({ title, subtitle, iconBadge: IconBadge, children, footer, stateKey, center = false }) {
  const isCentered = center || Boolean(IconBadge);

  return (
    <div>
      <div key={stateKey} className={clsx("mb-3.5 sm:mb-4", isCentered ? "text-center" : "text-left")}>
        {IconBadge && (
          <Reveal i={0} pop>
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-2.5 shadow-xs">
              <IconBadge size={18} className="stroke-[2.2]" />
            </div>
          </Reveal>
        )}
        <Reveal i={1}>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">{subtitle}</p>
          )}
        </Reveal>
      </div>

      {children}

      {footer && (
        <Reveal i={6}>
          <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-3.5 sm:mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
            {footer}
          </div>
        </Reveal>
      )}
    </div>
  );
}
