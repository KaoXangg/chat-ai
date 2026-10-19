import { motion } from "framer-motion";

export default function AuthHeroShowcase() {
  return (
    <div className="relative w-full h-full min-h-[580px] lg:min-h-[720px] rounded-3xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#eef2f9] via-[#e5ebf7] to-[#d8e0f3] dark:from-[#0d0f19] dark:via-[#090a12] dark:to-[#05060b] select-none shadow-inner transition-colors duration-300">
      {/* Light subtle vertical streaks from reference image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[12%] left-[18%] w-1.5 h-20 rounded-full bg-white/60 dark:bg-white/5 blur-[1px]" />
        <div className="absolute top-[28%] right-[22%] w-1.5 h-24 rounded-full bg-white/50 dark:bg-white/5 blur-[1px]" />
        <div className="absolute bottom-[20%] left-[28%] w-1.5 h-16 rounded-full bg-white/40 dark:bg-white/5 blur-[1px]" />
        <div className="absolute top-[45%] right-[14%] w-1.5 h-14 rounded-full bg-white/35 dark:bg-white/5 blur-[1px]" />
        
        {/* Soft radial glow behind artwork matching brand purple & cyan */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-[#705aff]/15 dark:bg-[#705aff]/20 blur-3xl pointer-events-none" />
      </div>

      {/* Floating 3D Chat AI Brand Logo Artwork */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-8">
        <motion.div
          animate={{
            y: [0, -12, 0],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative group"
        >
          {/* Light Mode 3D Logo (exact rectangular bubble + star + cyan dot) */}
          <img
            src="/auth-hero-3d.jpg"
            alt="Chat AI 3D Logo"
            className="dark:hidden w-[280px] sm:w-[320px] lg:w-[350px] xl:w-[390px] h-auto object-contain rounded-[32px] shadow-[0_20px_50px_rgba(88,67,230,0.22)] border border-white/60"
            draggable={false}
          />

          {/* Dark Mode 3D Logo (exact rectangular bubble + star + cyan dot) */}
          <img
            src="/auth-hero-3d-dark.jpg"
            alt="Chat AI 3D Logo Dark"
            className="hidden dark:block w-[280px] sm:w-[320px] lg:w-[350px] xl:w-[390px] h-auto object-contain rounded-[32px] shadow-[0_20px_60px_rgba(112,90,255,0.28)] border border-white/10"
            draggable={false}
          />
        </motion.div>

        {/* Soft floating shadow on ground */}
        <motion.div
          animate={{
            scale: [1, 0.88, 1],
            opacity: [0.28, 0.16, 0.28],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-48 sm:w-56 h-5 rounded-full bg-indigo-950/25 dark:bg-black/60 blur-md mt-6"
        />
      </div>
    </div>
  );
}
