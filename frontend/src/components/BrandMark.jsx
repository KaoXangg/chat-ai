import { useId } from "react";

export default function BrandMark({ size = 36, className = "" }) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="Chat AI"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8a72ff" />
          <stop offset="100%" stopColor="#4433b8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="13" fill={`url(#${gradientId})`} />
      <path
        d="M10.5 9.5h19a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-8l-7 5v-5h-4a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z"
        fill="white"
      />
      <path
        d="m19.5 12.3 1.55 3.9 3.95 1.55-3.95 1.55-1.55 3.9-1.55-3.9L14 17.75l3.95-1.55 1.55-3.9Z"
        fill="#5843e6"
      />
      <circle cx="27" cy="12.5" r="1.4" fill="#2dd4bf" />
    </svg>
  );
}