import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code2, 
  Bug, 
  Sparkles, 
  FileText, 
  Languages, 
  Lightbulb, 
  CheckCircle2, 
  Mail, 
  ListTree, 
  ShieldAlert, 
  Zap, 
  Search,
  X
} from "lucide-react";
import clsx from "clsx";

export const PROMPTS_CATALOG = [
  // Lập trình
  {
    id: "explain",
    slash: "/explain",
    category: "code",
    categoryName: "Lập trình",
    title: "Giải thích mã nguồn",
    desc: "Giải thích cặn kẽ cách hoạt động, luồng dữ liệu và ý nghĩa của đoạn code.",
    icon: Code2,
    template: "Hãy giải thích chi tiết đoạn mã sau theo từng bước, chỉ rõ luồng thực thi và các điểm cần lưu ý:\n\n```\n[Dán mã nguồn vào đây]\n```",
  },
  {
    id: "debug",
    slash: "/debug",
    category: "code",
    categoryName: "Lập trình",
    title: "Tìm lỗi & Sửa bug",
    desc: "Phân tích nguyên nhân gây lỗi, chỉ ra vị trí sai và cung cấp giải pháp khắc phục.",
    icon: Bug,
    template: "Đoạn mã sau đang gặp lỗi hoặc hành vi không như mong muốn. Hãy phân tích nguyên nhân gốc rễ và đề xuất cách sửa chuẩn xác nhất:\n\n```\n[Dán mã lỗi hoặc log thông báo lỗi vào đây]\n```",
  },
  {
    id: "refactor",
    slash: "/refactor",
    category: "code",
    categoryName: "Lập trình",
    title: "Tối ưu & Tái cấu trúc",
    desc: "Refactor code sạch hơn, áp dụng Clean Code, Best Practices và tối ưu hiệu năng.",
    icon: Zap,
    template: "Hãy tái cấu trúc (refactor) đoạn code dưới đây theo các tiêu chuẩn Clean Code, Design Patterns phù hợp, dễ đọc và tối ưu hiệu năng hơn:\n\n```\n[Dán mã nguồn vào đây]\n```",
  },
  {
    id: "test",
    slash: "/test",
    category: "code",
    categoryName: "Lập trình",
    title: "Viết Unit Tests",
    desc: "Tạo bộ kiểm thử tự động bao phủ các trường hợp biên (edge cases).",
    icon: CheckCircle2,
    template: "Hãy viết bộ Unit Test đầy đủ cho đoạn code/hàm sau, chú trọng cả luồng thành công và các trường hợp biên (edge cases):\n\n```\n[Dán hàm hoặc class vào đây]\n```",
  },
  {
    id: "security",
    slash: "/security",
    category: "code",
    categoryName: "Lập trình",
    title: "Kiểm tra bảo mật Code",
    desc: "Quét lỗ hổng tiềm ẩn (SQL injection, XSS, tràn bộ nhớ, lộ secret).",
    icon: ShieldAlert,
    template: "Hãy rà soát bảo mật cho đoạn mã sau. Liệt kê các lỗ hổng tiềm ẩn và hướng dẫn cách khắc phục an toàn:\n\n```\n[Dán mã nguồn vào đây]\n```",
  },

  // Viết lách & Công việc
  {
    id: "email",
    slash: "/email",
    category: "writing",
    categoryName: "Soạn thảo",
    title: "Soạn Email công việc",
    desc: "Viết thư điện tử trang trọng, lịch thiệp và đúng trọng tâm gửi đồng nghiệp/đối tác.",
    icon: Mail,
    template: "Hãy giúp tôi viết một email công việc chuyên nghiệp và lịch sự với các thông tin sau:\n- Người nhận: [Đối tác / Quản lý / Khách hàng]\n- Mục đích: [Mục đích chính của email]\n- Các điểm cần nêu: [Nội dung tóm tắt]\n- Giọng điệu: Chuyên nghiệp, thân thiện, rõ ràng.",
  },
  {
    id: "summarize",
    slash: "/summarize",
    category: "writing",
    categoryName: "Soạn thảo",
    title: "Tóm tắt ngắn gọn",
    desc: "Trích xuất các ý chính cốt lõi dạng gạch đầu dòng (bullet points).",
    icon: FileText,
    template: "Hãy đọc văn bản dưới đây và tóm tắt lại thành 3-5 gạch đầu dòng quan trọng nhất, kèm một câu kết luận ngắn gọn:\n\n\"\"\"\n[Dán văn bản cần tóm tắt]\n\"\"\"",
  },
  {
    id: "outline",
    slash: "/outline",
    category: "writing",
    categoryName: "Soạn thảo",
    title: "Lập đề cương / Kế hoạch",
    desc: "Xây dựng dàn ý chi tiết cho bài viết, báo cáo hoặc dự án sắp triển khai.",
    icon: ListTree,
    template: "Hãy lập một đề cương (outline) chi tiết theo từng phần cho chủ đề: \"[Nhập chủ đề bài viết hoặc dự án]\". Chia rõ các đề mục chính và gợi ý nội dung từng mục.",
  },

  // Ngoại ngữ & Dịch thuật
  {
    id: "translate",
    slash: "/translate",
    category: "language",
    categoryName: "Dịch thuật",
    title: "Dịch thuật chuyên sâu",
    desc: "Dịch chính xác, giữ nguyên thuật ngữ chuyên ngành và văn phong tự nhiên.",
    icon: Languages,
    template: "Hãy dịch đoạn văn bản sau sang [Tiếng Việt / Tiếng Anh]. Đảm bảo văn phong tự nhiên của người bản xứ và giữ đúng thuật ngữ chuyên ngành:\n\n\"\"\"\n[Dán văn bản cần dịch]\n\"\"\"",
  },
  {
    id: "proofread",
    slash: "/proofread",
    category: "language",
    categoryName: "Dịch thuật",
    title: "Sửa lỗi ngữ pháp & Văn phong",
    desc: "Chỉnh sửa câu từ, giải thích lý do sai và đề xuất câu viết hay hơn.",
    icon: Sparkles,
    template: "Hãy rà soát và chỉnh sửa lỗi chính tả, ngữ pháp, cách dùng từ cho đoạn văn sau. Vui lòng giải thích ngắn gọn những chỗ bạn đã chỉnh sửa:\n\n\"\"\"\n[Dán văn bản cần sửa]\n\"\"\"",
  },

  // Sáng tạo & Tư duy
  {
    id: "brainstorm",
    slash: "/brainstorm",
    category: "creative",
    categoryName: "Sáng tạo",
    title: "Brainstorm 10 ý tưởng",
    desc: "Tạo danh sách các ý tưởng độc đáo, sáng tạo và có tính khả thi cao.",
    icon: Lightbulb,
    template: "Hãy brainstorm 10 ý tưởng độc đáo, sáng tạo và có tiềm năng triển khai thực tế cho chủ đề: \"[Nhập vấn đề hoặc chủ đề cần ý tưởng]\". Với mỗi ý tưởng, phân tích ưu điểm nổi bật.",
  },
  {
    id: "critique",
    slash: "/critique",
    category: "creative",
    categoryName: "Sáng tạo",
    title: "Đóng vai phản biện sắc bén",
    desc: "Chỉ ra các điểm yếu, rủi ro tiềm ẩn và các góc nhìn phản biện đa chiều.",
    icon: Sparkles,
    template: "Hãy đóng vai một chuyên gia phản biện khó tính và sắc sảo. Phân tích các rủi ro, điểm yếu và thiếu sót trong ý tưởng/kế hoạch sau đây của tôi:\n\n\"\"\"\n[Mô tả ý tưởng hoặc kế hoạch]\n\"\"\"",
  },
];

/**
 * Menu gợi ý Slash Commands khi người dùng gõ "/" hoặc ấn nút Prompt Library
 */
export default function PromptMenu({
  isOpen,
  filterQuery = "",
  onSelectPrompt,
  onClose,
  anchorRef,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  // Lọc danh sách prompt theo từ khóa tìm kiếm
  const filteredPrompts = useMemo(() => {
    const q = filterQuery.toLowerCase().replace(/^\//, "").trim();
    if (!q) return PROMPTS_CATALOG;
    return PROMPTS_CATALOG.filter(
      (p) =>
        p.slash.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  // Reset index khi filter đổi
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterQuery]);

  // Điều hướng bằng phím mũi tên
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredPrompts.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredPrompts.length) % Math.max(1, filteredPrompts.length));
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (filteredPrompts[selectedIndex]) {
          e.preventDefault();
          onSelectPrompt(filteredPrompts[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredPrompts, onSelectPrompt, onClose]);

  // Tự cuộn item active vào tầm nhìn
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      activeEl?.scrollIntoView?.({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="absolute bottom-full left-0 right-0 mb-3 z-30 max-h-[380px] flex flex-col rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* Header gợi ý */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <Sparkles size={14} />
            <span>Lệnh nhanh & Thư viện Prompt ({filteredPrompts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] text-zinc-400">
              Dùng <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono text-[10px]">↓</kbd> để chọn, <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono text-[10px]">Enter</kbd> áp dụng
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Danh sách prompts */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPrompts.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Không tìm thấy lệnh nào khớp với &quot;{filterQuery}&quot;
            </div>
          ) : (
            filteredPrompts.map((p, idx) => {
              const Icon = p.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPrompt(p)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    "w-full flex items-start gap-3 p-2.5 rounded-xl text-start transition-all",
                    isSelected
                      ? "bg-brand-500/10 dark:bg-brand-500/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-brand-500/30"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  <div
                    className={clsx(
                      "p-2 rounded-lg shrink-0 mt-0.5 transition-colors",
                      isSelected
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-brand-600 dark:text-brand-400 font-mono">
                        {p.slash}
                      </span>
                      <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {p.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {p.categoryName}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {p.desc}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
