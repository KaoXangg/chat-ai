export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f0ff",
          100: "#e6e2ff",
          200: "#cdc5ff",
          300: "#ac9dff",
          400: "#8a72ff",
          500: "#6d5bff",
          600: "#5843e6",
          700: "#4433b8",
          800: "#332894",
          900: "#241d6b",
        },
        ion: {
          400: "#4fe3cd",
          500: "#2dd4bf",
          600: "#1fb8a5",
        },
        surface: {
          light: "#f7f7fb",
          dark: "#08080f",
        },
        panel: {
          light: "#ffffff",
          dark: "#14141f",
        },
        edge: {
          light: "rgba(17, 17, 34, 0.08)",
          dark: "rgba(255, 255, 255, 0.08)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["\"Space Grotesk\"", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(109,91,255,0.4), 0 8px 30px -8px rgba(109,91,255,0.55)",
        "glow-ion": "0 0 0 1px rgba(45,212,191,0.4), 0 8px 30px -8px rgba(45,212,191,0.5)",
        soft: "0 1px 2px rgba(15,15,35,0.04), 0 12px 32px -12px rgba(15,15,35,0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.16,1,.3,1) both",
        "pop-in": "pop-in .2s cubic-bezier(.16,1,.3,1) both",
      },
    },
  },
  plugins: [],
};