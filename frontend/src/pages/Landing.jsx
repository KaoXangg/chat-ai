import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Cpu,
  FileText,
  Mic,
  Code2,
  ShieldCheck,
  Brain,
  Globe,
  Zap,
  Clock,
  Check,
  Command,
  Layers,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";
import BrandMark from "../components/BrandMark.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO_SCENARIOS = [
  {
    id: "artifact",
    tab: "Artifact Canvas & Mermaid",
    icon: Code2,
    prompt: "Thiết kế thẻ thống kê doanh thu SaaS bằng Tailwind CSS và vẽ luồng thanh toán.",
    model: "groq • llama-3.3-70b-versatile",
    speed: "68.4 tok/s",
    latency: "0.9s",
    answer:
      "Dưới đây là giao diện **SaaS Revenue Card** tối ưu Dark Mode kèm khung xem trước trực tiếp bên cạnh. Bạn có thể chỉnh sửa mã HTML/Tailwind hoặc tải về ngay:",
    codeSnippet: `<div class="p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl">
  <div class="text-xs uppercase tracking-wider opacity-80">Doanh thu định kỳ (MRR)</div>
  <div class="text-3xl font-bold mt-1">$48,290 <span class="text-xs bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">+24.8%</span></div>
</div>`,
    highlights: ["Xem trước HTML/SVG/Mermaid song song", "Chỉnh sửa Live Code thời gian thực", "Tải xuống tệp chỉ với 1 chạm"],
  },
  {
    id: "document",
    tab: "Đọc PDF, DOCX & Dữ liệu",
    icon: FileText,
    prompt: "[Tài liệu: Bao-cao-tai-chinh-Q3.pdf] Tóm tắt 3 điểm cốt lõi và trích xuất bảng KPI.",
    model: "gemini • gemini-2.5-flash",
    speed: "52.1 tok/s",
    latency: "1.2s",
    answer:
      "Đã phân tích **Bao-cao-tai-chinh-Q3.pdf (14 trang)**. Tốc độ tăng trưởng người dùng đạt **+38% QoQ**, tỷ lệ giữ chân đạt **94.2%** và chi phí hạ tầng giảm **19%** nhờ bộ định tuyến AI thông minh.",
    codeSnippet: `| Chỉ số KPI | Quý 2 | Quý 3 | Tăng trưởng |
| :--- | :--- | :--- | :--- |
| Người dùng hoạt động | 12,400 | 17,110 | +38.0% |
| Độ trễ phản hồi TB | 1.45s | 0.88s | -39.3% |`,
    highlights: ["Bóc tách trực tiếp file .PDF, .DOCX, .CSV, .MD", "Sao chép hoặc tải bảng dữ liệu ra .CSV", "Tự động nén ảnh Vision tốc độ cao"],
  },
  {
    id: "web",
    tab: "Tìm kiếm Web & Bộ nhớ",
    icon: Globe,
    prompt: "So sánh xu hướng kiến trúc AI Agent năm nay dựa trên стек Node.js + SQL Server của tôi.",
    model: "openrouter • deepseek-r1",
    speed: "44.7 tok/s",
    latency: "1.5s",
    answer:
      "Dựa trên **Bộ nhớ dài hạn** của bạn (*Đang dùng Node.js + SQL Server*) và **4 nguồn Web thời gian thực**, mô hình Hybrid RAG kết hợp Streaming SSE và Per-Model Cooldown giúp đạt độ ổn định 99.9%.",
    codeSnippet: `[1] architecture.ai/agentic-rag-2026 — Hybrid SQL + Vector patterns
[2] nodejs.org/en/learn/streams — High-throughput SSE Streaming`,
    highlights: ["Thẻ trích dẫn nguồn Web kèm Favicon", "Ghi nhớ thông tin cá nhân hóa dài hạn", "Bảng lệnh nhanh Ctrl+K toàn cục"],
  },
];

const BENTO_FEATURES = [
  {
    icon: Cpu,
    title: "AI Router Đa Mô Hình & Cooldown Theo Model",
    desc: "Tích hợp Groq, Google Gemini và OpenRouter. Tự động chuyển đổi dự phòng (Fallback) khi quá tải và cách ly Cooldown chính xác theo từng cặp Provider/Model.",
    badge: "Multi-Provider",
  },
  {
    icon: Layers,
    title: "Artifact Canvas & Sơ Đồ Mermaid Song Song",
    desc: "Khung xem trước trực tiếp nằm ngay bên phải cuộc trò chuyện. Hỗ trợ biên tập mã HTML/CSS/JS, SVG và sơ đồ Mermaid với chế độ xem Desktop / Tablet / Mobile.",
    badge: "Live Canvas",
  },
  {
    icon: FileText,
    title: "Đính Kèm & Giải Mã Tài Liệu (PDF, DOCX, CSV)",
    desc: "Trích xuất văn bản trực tiếp từ tệp PDF, Word (.docx), CSV, JSON, Markdown và mã nguồn, kết hợp phân tích hình ảnh Vision đã được tối ưu dung lượng.",
    badge: "Document AI",
  },
  {
    icon: Mic,
    title: "Giọng Nói Hai Chiều (Whisper STT & Đa Tốc Độ TTS)",
    desc: "Nhập liệu bằng giọng nói tiếng Việt & tiếng Anh siêu tốc qua Web Speech API hoặc Groq Whisper, kèm tính năng đọc to câu trả lời với tùy chỉnh tốc độ 1x / 1.25x / 1.5x.",
    badge: "Voice AI",
  },
  {
    icon: Brain,
    title: "Bộ Nhớ Dài Hạn & Trợ Lý Chuyên Biệt (Personas)",
    desc: "Lưu trữ các sự kiện, sở thích và ngữ cảnh công việc của riêng bạn trong User Memories, kết hợp kho Personas chuyên gia lập trình, dịch thuật, phân tích.",
    badge: "Personalized",
  },
  {
    icon: ShieldCheck,
    title: "Quản Trị Doanh Nghiệp, Kiểm Duyệt & Hạn Mức",
    desc: "Phân quyền Admin RBAC, quy trình duyệt nâng cấp gói dịch vụ, bộ lọc từ khóa theo ranh giới từ Unicode, quản lý phiên đăng nhập và nhật ký Audit Logs.",
    badge: "Enterprise Ready",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState("artifact");
  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-zinc-900 dark:text-zinc-100 relative overflow-x-hidden selection:bg-brand-500/30">
      <div className="aurora-bg" aria-hidden="true" />

      {/* Thanh điều hướng cố định */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 dark:border-white/[0.07] bg-white/75 dark:bg-[#090a10]/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight">
            <BrandMark size={34} />
            <span>Chat AI</span>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/25">
              Workspace 2.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <a href="#demo" className="hover:text-brand-500 transition-colors">Trải nghiệm</a>
            <a href="#features" className="hover:text-brand-500 transition-colors">Tính năng</a>
            <Link to="/pricing" className="hover:text-brand-500 transition-colors">Bảng giá</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {user ? (
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all"
              >
                <MessageSquare size={16} />
                <span>Mở Khung Chat</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all"
                >
                  <span>Bắt đầu miễn phí</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/25 mb-6"
          >
            <Sparkles size={14} />
            <span>Hợp nhất Groq, Gemini & OpenRouter trong một không gian làm việc</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.12]"
          >
            Trợ lý AI đa mô hình{" "}
            <span className="bg-gradient-to-r from-brand-500 via-indigo-400 to-teal-400 bg-clip-text text-transparent">
              hiện đại & chuyên nghiệp
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed"
          >
            Tích hợp khung xem trước trực tiếp <strong>Artifact Canvas</strong>, đọc tài liệu{" "}
            <strong>PDF/DOCX</strong>, nhận diện giọng nói <strong>Groq Whisper</strong>, bộ nhớ dài hạn và bảng lệnh nhanh{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-mono rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Ctrl+K
            </kbd>{" "}
            chuẩn SaaS.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to={user ? "/chat" : "/register"}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 shadow-lg shadow-brand-500/25 transition-all"
            >
              <span>{user ? "Vào không gian Chat ngay" : "Tạo tài khoản miễn phí"}</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold border border-zinc-300 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 hover:border-brand-500/50 transition-all"
            >
              <span>Xem bảng giá & Gói dịch vụ</span>
            </Link>
          </motion.div>
        </div>

        {/* Khung tương tác thử nghiệm (Interactive Showcase) */}
        <section id="demo" className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
            {DEMO_SCENARIOS.map((sc) => {
              const Icon = sc.icon;
              const active = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenarioId(sc.id)}
                  className={clsx(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border",
                    active
                      ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20"
                      : "bg-white/80 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-brand-500/40"
                  )}
                >
                  <Icon size={15} />
                  <span>{sc.tab}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-[#13151f]/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Thanh cửa sổ macOS */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ms-2 font-mono text-zinc-500 dark:text-zinc-400">
                  {activeScenario.model}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  <Zap size={11} /> {activeScenario.speed}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                  <Clock size={11} /> {activeScenario.latency}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-300 font-mono text-[11px]">
                  <Command size={11} /> Ctrl+K
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Cột hội thoại */}
              <div className="lg:col-span-7 p-5 sm:p-7 space-y-5 border-b lg:border-b-0 lg:border-e border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-brand-600 text-white text-sm max-w-md shadow-xs">
                    {activeScenario.prompt}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BrandMark size={30} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-3">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                      {activeScenario.answer}
                    </p>
                    <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-800">
                      {activeScenario.codeSnippet}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Cột điểm nhấn kỹ thuật */}
              <div className="lg:col-span-5 p-5 sm:p-7 bg-zinc-50/60 dark:bg-zinc-900/30 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
                    Điểm nổi bật trong kịch bản này
                  </div>
                  <h3 className="font-display text-lg font-bold mb-4">{activeScenario.tab}</h3>
                  <ul className="space-y-3">
                    {activeScenario.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={12} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sẵn sàng trải nghiệm trực tiếp?
                  </span>
                  <Link
                    to={user ? "/chat" : "/login"}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <span>Thử ngay trên khung Chat</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid 6 Tính năng cốt lõi */}
        <section id="features" className="mt-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Kiến trúc toàn diện cho học tập, lập trình & doanh nghiệp
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Mọi chi tiết từ giao diện người dùng đến bộ định tuyến AI phía máy chủ đều được thiết kế theo tiêu chuẩn sản phẩm thực tế.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENTO_FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#13151f]/80 hover:border-brand-500/50 transition-all shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Chat AI Platform</span>
            <span>— Hệ thống trợ lý AI đa mô hình</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/chat" className="hover:text-brand-500 transition-colors">Không gian Chat</Link>
            <Link to="/pricing" className="hover:text-brand-500 transition-colors">Bảng giá</Link>
            <Link to="/login" className="hover:text-brand-500 transition-colors">Đăng nhập</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

