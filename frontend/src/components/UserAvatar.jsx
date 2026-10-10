import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * Hiển thị avatar DiceBear (SVG CDN). Nếu lỗi tải / không có URL → fallback chữ cái.
 */
export default function UserAvatar({ user, size = 32, className, onClick, title }) {
  const [failed, setFailed] = useState(false);
  const px = typeof size === "number" ? size : 32;
  const letter = user?.username?.[0]?.toUpperCase() || "?";
  const src = user?.avatar && !failed ? user.avatar : null;

  // Khi URL avatar đổi (sau randomize), cho phép load lại
  useEffect(() => {
    setFailed(false);
  }, [user?.avatar]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={title}
      aria-label={title || (user?.username ? `Avatar ${user.username}` : "Avatar")}
      className={clsx(
        "relative shrink-0 rounded-full overflow-hidden flex items-center justify-center",
        "bg-linear-to-br from-ion-400 to-ion-600 text-white font-semibold shadow-glow-ion",
        onClick && "cursor-pointer hover:ring-2 hover:ring-brand-400/50 transition-shadow",
        !onClick && "cursor-default",
        className
      )}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(px * 0.38)) }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <span>{letter}</span>
      )}
    </button>
  );
}