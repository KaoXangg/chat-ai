import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, X, ChevronLeft, ChevronRight, ChevronDown, Pencil, AlertTriangle, ImageOff, Volume2, VolumeX, Eye, Code2, Maximize2, GitFork, Download, Hash, Globe, Sparkles, Zap, Clock, PanelRightOpen, Brain, Bookmark } from "lucide-react";
import CodePreviewModal, { preparePreviewDoc } from "./CodePreviewModal.jsx";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import BrandMark from "./BrandMark.jsx";
import Tooltip from "./Tooltip.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useModalA11y } from "../hooks/useModalA11y.js";
import { useMessageImages } from "../hooks/useMessageImages.js";
import { preprocessMath } from "../utils/mathPreprocess.js";
import { extractCopyText } from "../utils/copyText.js";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";

// Only common languages are bundled (keeps the app small); others render as plain text.
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("php", php);

function ImageGrid({ images, onOpen }) {
  const { t } = useI18n();
  if (images.length === 0) return null;
  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 3
      ? "grid-cols-2 [&>*:first-child]:row-span-2"
      : "grid-cols-2";

  return (
    <div className={clsx("grid gap-1.5 mb-2", gridClass, images.length === 1 ? "max-w-[260px]" : "max-w-[300px]")}>
      {images.map((image, i) => (
        <button
          key={i}
          type="button"
          onClick={() => image.src && onOpen(i)}
          disabled={!image.src}
          className={clsx(
            "relative rounded-xl overflow-hidden border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-brand-400",
            image.src && images.length === 1 ? "aspect-auto" : "aspect-square"
          )}
        >
          {image.src ? (
            <img src={image.src} alt={t("msg.imageAlt", { n: i + 1 })} className="w-full h-full object-cover" />
          ) : image.failed ? (
            <span
              role="img"
              aria-label={t("msg.imageFailed")}
              title={t("msg.imageFailed")}
              className="w-full h-full min-h-[72px] min-w-[72px] flex items-center justify-center bg-black/10 dark:bg-white/10"
            >
              <ImageOff size={20} className="opacity-60" />
            </span>
          ) : (
            <span aria-hidden="true" className="block w-full h-full min-h-[72px] min-w-[72px] animate-pulse bg-black/10 dark:bg-white/10" />
          )}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, index, onClose, onNav }) {
  const { t } = useI18n();
  const dialogRef = useModalA11y(index !== null, onClose);

  useEffect(() => {
    if (index === null || images.length < 2) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, images.length, onNav]);

  if (index === null || !images[index]?.src) return null;
  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xs flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("msg.lightbox")}
    >
      <button
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
      >
        <X size={18} />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNav(-1);
            }}
            aria-label={t("msg.prevImage")}
            className="absolute start-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNav(1);
            }}
            aria-label={t("msg.nextImage")}
            className="absolute end-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        src={images[index]?.src}
        alt={t("msg.imageAlt", { n: index + 1 })}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-2xl object-contain"
      />

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/70">
          {index + 1} / {images.length}
        </div>
      )}
    </motion.div>
  );
}

function CodeBlock({ language, code }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const langLower = (language || "").toLowerCase();
  const [activeTab, setActiveTab] = useState(langLower === "mermaid" ? "preview" : "code"); // "code" | "preview"
  const [modalOpen, setModalOpen] = useState(false);

  const isPreviewable =
    ["html", "htm", "markup", "svg", "xml", "mermaid"].includes(langLower) ||
    (typeof code === "string" &&
      (code.includes("<!DOCTYPE html") ||
        code.includes("<html") ||
        code.includes("<svg") ||
        code.includes("<div") ||
        code.includes("<style>") ||
        code.includes("<canvas") ||
        code.includes("<button")));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadFile = () => {
    const extMap = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      csharp: "cs",
      markdown: "md",
      mermaid: "mmd",
      markup: "html",
    };
    const ext = extMap[langLower] || langLower || "txt";
    const blob = new Blob([code || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpenCanvas = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      window.dispatchEvent(
        new CustomEvent("open-artifact-panel", {
          detail: { code, language: language || "html" },
        })
      );
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div
        data-copy-code={code}
        dir="ltr"
        className="my-4 rounded-xl overflow-hidden border border-edge-light dark:border-edge-dark bg-[#fafafa] dark:bg-[#1e2128] max-w-full shadow-xs"
      >
        <div
          data-copy-ignore="true"
          className="flex items-center justify-between px-3 py-2 bg-black/[0.04] dark:bg-white/[0.05] border-b border-black/[0.05] dark:border-white/[0.06] text-xs text-zinc-600 dark:text-zinc-300"
        >
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 me-0.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/85" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/85" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/85" />
            </span>
            <span className="font-mono font-semibold text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200">
              {language || "code"}
            </span>
            {isPreviewable && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors",
                    activeTab === "code"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Code2 size={12} /> Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors",
                    activeTab === "preview"
                      ? "bg-brand-500 text-white shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Eye size={12} /> Xem trước
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === "code" && (
              <button
                type="button"
                onClick={() => setShowLineNumbers((v) => !v)}
                title="Bật/tắt đánh số dòng"
                aria-label="Bật/tắt đánh số dòng"
                className={clsx(
                  "flex items-center gap-1 px-1.5 py-1 rounded-lg transition-colors",
                  showLineNumbers
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-300 font-medium"
                    : "hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400"
                )}
              >
                <Hash size={13} />
              </button>
            )}
            {isPreviewable && (
              <>
                <button
                  type="button"
                  onClick={handleOpenCanvas}
                  title="Mở khung Artifact Canvas bên cạnh"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-medium transition-colors"
                >
                  <PanelRightOpen size={13} />
                  <span className="hidden sm:inline">Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  title="Phóng to toàn màn hình"
                  aria-label="Phóng to toàn màn hình"
                  className="hidden sm:flex items-center gap-1 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  <Maximize2 size={13} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={downloadFile}
              title="Tải tệp mã nguồn"
              aria-label="Tải tệp mã nguồn"
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <Download size={13} />
            </button>
            <button
              onClick={copy}
              aria-label={t("msg.codeCopyAria")}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? t("msg.codeCopied") : t("msg.codeCopy")}
            </button>
          </div>
        </div>

        {isPreviewable && activeTab === "preview" ? (
          <div className="w-full h-[320px] bg-white overflow-hidden relative border-t border-zinc-200 dark:border-zinc-700">
            <iframe
              srcDoc={preparePreviewDoc(code, language)}
              title="Inline Code Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        ) : (
          <SyntaxHighlighter
            language={language || "text"}
            style={theme === "dark" ? oneDark : oneLight}
            showLineNumbers={showLineNumbers}
            customStyle={{ margin: 0, borderRadius: 0, background: "transparent", fontSize: "13px", padding: "1rem" }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>

      {isPreviewable && (
        <CodePreviewModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          code={code}
          language={language}
        />
      )}
    </>
  );
}

function MarkdownTable({ children, ...props }) {
  const tableRef = useRef(null);
  const [csvCopied, setCsvCopied] = useState(false);

  const buildCsvFromTable = () => {
    const table = tableRef.current;
    if (!table) return "";
    return [...table.querySelectorAll("tr")]
      .map((row) =>
        [...row.children]
          .map((cell) => {
            const val = (cell.textContent || "").trim().replace(/\s+/g, " ").replace(/"/g, '""');
            return /[",\n]/.test(val) ? `"${val}"` : val;
          })
          .join(",")
      )
      .join("\n");
  };

  const handleCopyCsv = async () => {
    const csvText = buildCsvFromTable();
    if (!csvText) return;
    const ok = await writeClipboardText(csvText);
    if (ok) {
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 1500);
    }
  };

  const handleDownloadCsv = () => {
    const csvText = buildCsvFromTable();
    if (!csvText) return;
    const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Sử dụng thẻ span.block để không nằm trong BLOCK_TAGS của copyText.js -> giữ nguyên 100% định dạng khi Copy Answer
  return (
    <span className="markdown-table-card block my-4 rounded-xl border border-edge-light dark:border-edge-dark overflow-hidden bg-white/60 dark:bg-white/[0.02] shadow-2xs">
      <span
        data-copy-ignore="true"
        className="flex items-center justify-between px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] border-b border-edge-light dark:border-edge-dark text-[11px] text-zinc-500 dark:text-zinc-400"
      >
        <span className="font-mono font-medium uppercase tracking-wider text-[10px]">Bảng dữ liệu</span>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyCsv}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            {csvCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            <span>{csvCopied ? "Đã chép CSV" : "Sao chép CSV"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <Download size={11} />
            <span>Tải .CSV</span>
          </button>
        </span>
      </span>
      <span className="block overflow-x-auto">
        <table ref={tableRef} {...props}>
          {children}
        </table>
      </span>
    </span>
  );
}

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [[rehypeKatex, { throwOnError: false, strict: "ignore" }]];

async function writeClipboardText(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

const MARKDOWN_COMPONENTS = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children);
    if (!match && !text.includes("\n")) {
      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1]} code={text.replace(/\n$/, "")} />;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  table({ children, ...props }) {
    return <MarkdownTable {...props}>{children}</MarkdownTable>;
  },
};

function getDomainInfo(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    return { domain, favicon };
  } catch {
    return { domain: "web", favicon: null };
  }
}

function RichSourceCards({ sources, label }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  return (
    <div data-copy-ignore="true" className="mt-3 pt-2.5 border-t border-edge-light dark:border-edge-dark">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <Globe size={12} className="text-brand-500" />
        <span>{label} ({sources.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {sources.map((s, i) => {
          const { domain, favicon } = getDomainInfo(s.url);
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group/src flex flex-col justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-brand-500/50 hover:bg-brand-500/[0.04] transition-all text-start"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-300 font-mono font-bold text-[10px] shrink-0">
                  {i + 1}
                </span>
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    className="w-3.5 h-3.5 rounded-xs shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Globe size={12} className="shrink-0" />
                )}
                <span className="truncate font-medium">{domain}</span>
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 group-hover/src:text-brand-600 dark:group-hover/src:text-brand-300 line-clamp-2 leading-snug">
                {s.title || s.url}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function buildFollowUpSuggestions(content = "") {
  const text = String(content || "");
  if (text.includes("```")) {
    return [
      "Giải thích chi tiết từng dòng code trên",
      "Viết thêm Unit Test và bắt lỗi ngoại lệ",
      "Làm sao để tối ưu hiệu năng đoạn code này?",
    ];
  }
  if (text.includes("|") && text.includes("---")) {
    return [
      "Tóm tắt các điểm khác biệt quan trọng nhất",
      "Phân tích ưu và nhược điểm thực tế",
      "Đưa ra khuyến nghị lựa chọn phù hợp nhất",
    ];
  }
  return [
    "Giải thích sâu hơn kèm ví dụ thực tế",
    "Tóm tắt ngắn gọn lại thành 3 ý chính",
    "Còn lưu ý hoặc trường hợp ngoại lệ nào không?",
  ];
}

/**
 * Tách nội dung suy luận <think>...</think> hoặc <thinking>...</thinking> khỏi câu trả lời chính.
 * Hỗ trợ cả khi đang stream dở (thẻ <think> đã mở nhưng chưa đóng).
 */
export function extractReasoning(rawContent = "") {
  const str = String(rawContent || "");
  if (!str.includes("<think")) {
    return { reasoning: "", cleanContent: str, isThinkingNow: false };
  }

  const thinkBlocks = [];
  let cleaned = str.replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi, (_, inner) => {
    if (inner && inner.trim()) thinkBlocks.push(inner.trim());
    return "";
  });

  let isThinkingNow = false;
  const openMatch = cleaned.match(/<think(?:ing)?>([\s\S]*)$/i);
  if (openMatch) {
    isThinkingNow = true;
    if (openMatch[1] && openMatch[1].trim()) {
      thinkBlocks.push(openMatch[1].trim());
    }
    cleaned = cleaned.slice(0, openMatch.index);
  }

  return {
    reasoning: thinkBlocks.join("\n\n").trim(),
    cleanContent: cleaned.trimStart(),
    isThinkingNow,
  };
}

function ReasoningBlock({ reasoning, isThinkingNow }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isThinkingNow) setExpanded(true);
  }, [isThinkingNow]);

  if (!reasoning && !isThinkingNow) return null;

  return (
    <div
      data-copy-ignore="true"
      className="mb-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] dark:bg-brand-500/[0.07] overflow-hidden text-xs"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-start font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-500/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Brain size={14} className={clsx("text-brand-500 shrink-0", isThinkingNow && "animate-pulse")} />
          <span>
            {isThinkingNow ? "AI đang suy luận..." : "Quá trình suy luận của AI (Chain-of-Thought)"}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={clsx("transition-transform duration-200 shrink-0 opacity-70", expanded && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-brand-500/15 px-3.5 py-2.5 text-zinc-600 dark:text-zinc-300 font-mono text-[12px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto bg-black/[0.02] dark:bg-black/20"
          >
            {reasoning || "Đang phân tích ngữ cảnh..."}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Render Markdown + công thức LaTeX (KaTeX). Memo để không render lại khi chỉ hover/đổi trạng thái nút. */
const MarkdownContent = memo(function MarkdownContent({ content }) {
  const processed = useMemo(() => preprocessMath(content || " "), [content]);
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {processed}
    </ReactMarkdown>
  );
});

const RATE_LIMIT_COOLDOWN_SECONDS = 8;

// Tiêu đề/gợi ý theo mã lỗi (khóa msg.err.title.<CODE> / msg.err.hint.<CODE>); mã khác dùng tiêu đề mặc định.
const ERROR_CODES_WITH_TEXT = new Set(["RATE_LIMITED", "NETWORK_ERROR"]);

/** Thẻ lỗi hiển thị ngay dưới câu trả lời (thay cho chuỗi "⚠️ ..." trong nội dung tin nhắn). */
function ErrorCard({ error, canRetry, onRetry }) {
  const { t } = useI18n();
  const isRateLimited = error.code === "RATE_LIMITED";
  const [cooldown, setCooldown] = useState(isRateLimited ? RATE_LIMIT_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const hasText = ERROR_CODES_WITH_TEXT.has(error.code);
  const title = hasText ? t(`msg.err.title.${error.code}`) : t("msg.err.title.default");
  const hint = hasText ? t(`msg.err.hint.${error.code}`) : null;

  return (
    <div role="alert" className="mt-2 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-500">{title}</p>
          <p className="mt-0.5 opacity-80 break-words">{error.message}</p>
          {hint && error.message !== hint && <p className="mt-1 text-[13px] opacity-60">{hint}</p>}
        </div>
      </div>
      {canRetry && (
        <div className="mt-3 ps-[26px]">
          <button
            type="button"
            onClick={onRetry}
            disabled={cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={13} />
            {cooldown > 0 ? t("msg.retryIn", { s: cooldown }) : t("msg.retry")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ô sửa tin nhắn tại chỗ. Ctrl/Cmd+Enter hoặc Enter để gửi, Esc để hủy. */
function MessageEditor({ initialValue, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    resize();
  }, []);

  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="w-full rounded-2xl border border-brand-400/60 glass p-3 shadow-soft">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        rows={2}
        aria-label={t("msg.edit")}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-hidden text-black dark:text-white"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-[13px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          {t("msg.editCancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!trimmed}
          className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-white bg-linear-to-br from-brand-500 to-brand-600 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {t("msg.editSave")}
        </button>
      </div>
    </div>
  );
}

export default function MessageBubble({
  message,
  isLast,
  onRegenerate,
  onFeedback,
  onEdit,
  onRetry,
  isStreaming,
  onFork,
  onSendFollowUp,
  isBookmarked = false,
  onToggleBookmark,
}) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const markdownRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useI18n();
  const isUser = message.role === "user";
  const images = useMessageImages(message);
  // Chỉ sửa được khi tin nhắn đã được lưu ở máy chủ (id thật) và không có luồng nào đang chạy.
  const canEdit = isUser && Boolean(onEdit) && !isStreaming && !String(message._id).startsWith("tmp-");

  const { reasoning, cleanContent, isThinkingNow } = useMemo(
    () => (isUser ? { reasoning: "", cleanContent: message.content || "", isThinkingNow: false } : extractReasoning(message.content)),
    [isUser, message.content]
  );

  const handleCopy = async () => {
    const text = extractCopyText(markdownRef.current);

    if (!text) return;

    const success = await writeClipboardText(text);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const { lang } = useI18n();

  useEffect(() => {
    return () => {
      if (isSpeaking && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const speakWithRate = (rateToUse) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = (message.content || "")
      .replace(/```[\s\S]*?```/g, " [Đoạn mã] ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_~\[\]()$]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);
    utterance.lang = isVietnamese ? "vi-VN" : lang === "ja" ? "ja-JP" : "en-US";
    utterance.rate = rateToUse;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeak = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    speakWithRate(ttsRate);
  };

  const handleCycleTtsRate = () => {
    const nextRate = ttsRate === 1.0 ? 1.25 : ttsRate === 1.25 ? 1.5 : 1.0;
    setTtsRate(nextRate);
    if (isSpeaking) {
      speakWithRate(nextRate);
    }
  };

  const navLightbox = (delta) => {
    setLightboxIndex((i) => (i === null ? null : (i + delta + images.length) % images.length));
  };

  const followUps = useMemo(() => {
    if (isUser || !isLast || isStreaming || !message.content || message.error || !onSendFollowUp) return [];
    return buildFollowUpSuggestions(message.content);
  }, [isUser, isLast, isStreaming, message.content, message.error, onSendFollowUp]);

  return (
    <motion.div
      id={`msg-${message._id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("group flex gap-3 px-4 py-5 rounded-2xl transition-all", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {isUser ? (
        <UserAvatar user={user} size={32} className="mt-0.5 shadow-glow" />
      ) : (
        <BrandMark size={32} className="shrink-0 mt-0.5" />
      )}

      <div className={clsx("flex flex-col min-w-0", isUser ? (isEditing ? "w-full max-w-[85%] items-end" : "max-w-[75%] items-end") : "flex-1 max-w-3xl items-start")}>
        {isUser && isEditing ? (
          <>
            <ImageGrid images={images} onOpen={setLightboxIndex} />
            <MessageEditor
              initialValue={message.content}
              onCancel={() => setIsEditing(false)}
              onSubmit={(text) => {
                setIsEditing(false);
                onEdit(message._id, text);
              }}
            />
          </>
        ) : (
        <div
          className={clsx(
            "text-[15px] leading-relaxed",
            isUser
              ? "px-4 py-2.5 rounded-2xl rounded-tr-md bg-brand-600 text-white"
              : "w-full px-1 py-0.5"
          )}
        >
          {isUser ? (
            <>
              <ImageGrid images={images} onOpen={setLightboxIndex} />
              {message.content && <p dir="auto" className="whitespace-pre-wrap break-words">{message.content}</p>}
            </>
          ) : isStreaming && isLast && !message.content && !message.error ? (
            <div className="typing-indicator" role="status" aria-label={t("msg.typing")}>
              <span />
              <span />
              <span />
            </div>
          ) : (
            <>
              <ReasoningBlock reasoning={reasoning} isThinkingNow={isThinkingNow && isStreaming && isLast} />
              {(cleanContent || !message.error) && (
                <div
                  ref={markdownRef}
                  dir="auto"
                  className={clsx("markdown-body", isStreaming && isLast && !message.error && "typing-cursor")}
                >
                  <MarkdownContent content={cleanContent} />
                </div>
              )}
              <RichSourceCards sources={message.sources} label={t("msg.sources")} />
              {message.error && (
                <ErrorCard
                  key={`${message.error.code}-${message.error.message}`}
                  error={message.error}
                  canRetry={isLast && !isStreaming && Boolean(onRetry)}
                  onRetry={() => onRetry(message)}
                />
              )}
            </>
          )}
        </div>
        )}

        {isUser && canEdit && !isEditing && (
          <div className="chat-message-actions flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Tooltip label={t("msg.edit")}>
              <button
                onClick={() => setIsEditing(true)}
                aria-label={t("msg.edit")}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Pencil size={14} className="opacity-60" />
              </button>
            </Tooltip>
          </div>
        )}

        {!isUser && message.content && (
          <div className="chat-message-actions flex flex-wrap items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Tooltip label={copied ? t("msg.copied") : t("msg.copy")}>
              <button onClick={handleCopy} aria-label={t("msg.copyAnswer")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                {copied ? <Check size={14} className="text-ion-500" /> : <Copy size={14} className="opacity-60" />}
              </button>
            </Tooltip>
            <Tooltip label={isSpeaking ? "Dừng đọc" : "Đọc to câu trả lời"}>
              <button
                type="button"
                onClick={handleToggleSpeak}
                aria-label="Đọc phản hồi bằng giọng nói"
                className={clsx(
                  "p-1.5 rounded-lg transition-colors",
                  isSpeaking
                    ? "text-brand-500 bg-brand-500/15"
                    : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                )}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </Tooltip>
            {isSpeaking && (
              <Tooltip label="Tốc độ đọc giọng nói">
                <button
                  type="button"
                  onClick={handleCycleTtsRate}
                  aria-label="Đổi tốc độ đọc"
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-400 hover:bg-brand-500/25 transition-colors"
                >
                  {ttsRate}x
                </button>
              </Tooltip>
            )}
            {Boolean(onToggleBookmark) && !String(message._id).startsWith("tmp-") && (
              <Tooltip label={isBookmarked ? "Bỏ đánh dấu tin nhắn" : "Đánh dấu tin nhắn quan trọng"}>
                <button
                  type="button"
                  onClick={() => onToggleBookmark(message)}
                  aria-label={isBookmarked ? "Bỏ đánh dấu tin nhắn" : "Đánh dấu tin nhắn"}
                  aria-pressed={isBookmarked}
                  className={clsx(
                    "p-1.5 rounded-lg transition-colors",
                    isBookmarked
                      ? "text-amber-500 bg-amber-500/15"
                      : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                  )}
                >
                  <Bookmark size={14} className={isBookmarked ? "fill-amber-500" : ""} />
                </button>
              </Tooltip>
            )}
            {Boolean(onFork) && !isStreaming && (
              <Tooltip label="Tách nhánh từ đây">
                <button
                  type="button"
                  onClick={() => onFork(message)}
                  aria-label="Tách nhánh cuộc trò chuyện từ đây"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors"
                >
                  <GitFork size={14} />
                </button>
              </Tooltip>
            )}
            {isLast && (
              <Tooltip label={t("msg.regenerate")}>
                <button onClick={onRegenerate} aria-label={t("msg.regenerate")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                  <RotateCcw size={14} className="opacity-60" />
                </button>
              </Tooltip>
            )}
            <Tooltip label={t("msg.like")}>
              <button
                onClick={() => onFeedback(message._id, message.feedback === "like" ? null : "like")}
                aria-label={t("msg.likeAria")}
                aria-pressed={message.feedback === "like"}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <ThumbsUp size={14} className={message.feedback === "like" ? "text-ion-500 fill-ion-500" : "opacity-60"} />
              </button>
            </Tooltip>
            <Tooltip label={t("msg.dislike")}>
              <button
                onClick={() => onFeedback(message._id, message.feedback === "dislike" ? null : "dislike")}
                aria-label={t("msg.dislikeAria")}
                aria-pressed={message.feedback === "dislike"}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <ThumbsDown size={14} className={message.feedback === "dislike" ? "text-red-500 fill-red-500" : "opacity-60"} />
              </button>
            </Tooltip>

            {(message.provider || message.model || message.telemetry) && (
              <div data-copy-ignore="true" className="flex flex-wrap items-center gap-1.5 ms-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {message.provider && (
                  <span className="px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] font-medium capitalize">
                    {message.provider}{message.model ? ` • ${String(message.model).split("/").pop()}` : ""}
                  </span>
                )}
                {message.telemetry?.tokensPerSec > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                    <Zap size={10} /> {message.telemetry.tokensPerSec} tok/s
                  </span>
                )}
                {message.telemetry?.durationMs > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] font-mono text-[10px]">
                    <Clock size={10} /> {(message.telemetry.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
                {message.telemetry?.totalTokens > 0 && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] font-mono text-[10px]">
                    {message.telemetry.totalTokens} tok
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gợi ý câu hỏi tiếp theo (Follow-up Suggestions Chips) */}
        {followUps.length > 0 && (
          <div data-copy-ignore="true" className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 me-0.5">
              <Sparkles size={12} /> Gợi ý hỏi tiếp:
            </span>
            {followUps.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendFollowUp(promptText)}
                className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 hover:border-brand-500/50 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300 text-zinc-600 dark:text-zinc-300 transition-all"
              >
                {promptText}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={navLightbox} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
