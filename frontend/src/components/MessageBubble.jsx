import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, X, ChevronLeft, ChevronRight, Pencil, AlertTriangle } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import BrandMark from "./BrandMark.jsx";
import Tooltip from "./Tooltip.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useModalA11y } from "../hooks/useModalA11y.js";
import { preprocessMath } from "../utils/mathPreprocess.js";
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

/** Normalizes the legacy single-image fields and the new `images` array into one list of data URLs. */
function getImages(message) {
  if (message.images?.length) {
    return message.images.map((img) => `data:${img.mimeType};base64,${img.data}`);
  }
  if (message.imageBase64) {
    return [`data:${message.imageMimeType};base64,${message.imageBase64}`];
  }
  return [];
}

function ImageGrid({ images, onOpen }) {
  if (images.length === 0) return null;
  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 3
      ? "grid-cols-2 [&>*:first-child]:row-span-2"
      : "grid-cols-2";

  return (
    <div className={clsx("grid gap-1.5 mb-2", gridClass, images.length === 1 ? "max-w-[260px]" : "max-w-[300px]")}>
      {images.map((src, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i)}
          className={clsx(
            "relative rounded-xl overflow-hidden border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-400",
            images.length === 1 ? "aspect-auto" : "aspect-square"
          )}
        >
          <img src={src} alt={`Ảnh đính kèm ${i + 1}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, index, onClose, onNav }) {
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

  if (index === null) return null;
  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh lớn"
    >
      <button
        onClick={onClose}
        aria-label="Đóng"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
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
            aria-label="Ảnh trước"
            className="absolute left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNav(1);
            }}
            aria-label="Ảnh sau"
            className="absolute right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        src={images[index]}
        alt={`Ảnh đính kèm ${index + 1}`}
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
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div
      data-copy-code={code}
      className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#282c34]"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 text-xs text-white/60">
        <span className="font-mono">{language || "code"}</span>
        <button onClick={copy} aria-label="Sao chép mã" className="flex items-center gap-1.5 hover:text-white transition-colors">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Đã chép" : "Sao chép"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, background: "transparent", fontSize: "13px", padding: "1rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
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

function extractCopyText(root) {
  if (!root) return "";

  const clone = root.cloneNode(true);

  clone.querySelectorAll("[data-copy-ignore]").forEach((element) => element.remove());

  clone.querySelectorAll("[data-copy-code]").forEach((element) => {
    const code = element.getAttribute("data-copy-code") || "";
    element.replaceWith(document.createTextNode(`\n${code}\n`));
  });

  clone.querySelectorAll("table").forEach((table) => {
    const rows = [...table.querySelectorAll("tr")].map((row) =>
      [...row.children]
        .map((cell) => cell.innerText.trim().replace(/\s+/g, " "))
        .join("\t")
    );

    table.replaceWith(document.createTextNode(`\n${rows.join("\n")}\n`));
  });

  clone.querySelectorAll("ul").forEach((list) => {
    [...list.children].forEach((item) => {
      if (item.tagName === "LI") {
        item.insertBefore(document.createTextNode("• "), item.firstChild);
      }
    });
  });

  clone.querySelectorAll("ol").forEach((list) => {
    [...list.children].forEach((item, index) => {
      if (item.tagName === "LI") {
        item.insertBefore(document.createTextNode(`${index + 1}. `), item.firstChild);
      }
    });
  });

  clone.querySelectorAll("blockquote").forEach((quote) => {
    const lines = quote.innerText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    quote.textContent = lines.map((line) => `> ${line}`).join("\n");
  });

  const text = clone.innerText
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
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
};

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

const ERROR_TITLES = {
  RATE_LIMITED: "Đã chạm giới hạn tốc độ",
  NETWORK_ERROR: "Mất kết nối",
};

const ERROR_HINTS = {
  RATE_LIMITED: "Model miễn phí thường bị giới hạn khi có nhiều người dùng. Bạn có thể đợi vài giây hoặc đổi sang model khác ở thanh trên cùng.",
  NETWORK_ERROR: "Hãy kiểm tra kết nối mạng rồi thử lại.",
};

/** Thẻ lỗi hiển thị ngay dưới câu trả lời (thay cho chuỗi "⚠️ ..." trong nội dung tin nhắn). */
function ErrorCard({ error, canRetry, onRetry }) {
  const isRateLimited = error.code === "RATE_LIMITED";
  const [cooldown, setCooldown] = useState(isRateLimited ? RATE_LIMIT_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const hint = ERROR_HINTS[error.code];

  return (
    <div role="alert" className="mt-2 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-500">{ERROR_TITLES[error.code] || "Không thể tạo câu trả lời"}</p>
          <p className="mt-0.5 opacity-80 break-words">{error.message}</p>
          {hint && error.message !== hint && <p className="mt-1 text-[13px] opacity-60">{hint}</p>}
        </div>
      </div>
      {canRetry && (
        <div className="mt-3 pl-[26px]">
          <button
            type="button"
            onClick={onRetry}
            disabled={cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={13} />
            {cooldown > 0 ? `Thử lại (${cooldown}s)` : "Thử lại"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ô sửa tin nhắn tại chỗ. Ctrl/Cmd+Enter hoặc Enter để gửi, Esc để hủy. */
function MessageEditor({ initialValue, onSubmit, onCancel }) {
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
        aria-label="Sửa tin nhắn"
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none text-black dark:text-white"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-[13px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!trimmed}
          className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-white bg-gradient-to-br from-brand-500 to-brand-600 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Lưu và gửi
        </button>
      </div>
    </div>
  );
}

export default function MessageBubble({ message, isLast, onRegenerate, onFeedback, onEdit, onRetry, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const markdownRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const isUser = message.role === "user";
  const images = getImages(message);
  // Chỉ sửa được khi tin nhắn đã được lưu ở máy chủ (id thật) và không có luồng nào đang chạy.
  const canEdit = isUser && Boolean(onEdit) && !isStreaming && !String(message._id).startsWith("tmp-");

  const handleCopy = async () => {
    const text = extractCopyText(markdownRef.current);

    if (!text) return;

    const success = await writeClipboardText(text);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const navLightbox = (delta) => {
    setLightboxIndex((i) => (i === null ? null : (i + delta + images.length) % images.length));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("group flex gap-3 px-4 py-5", isUser ? "flex-row-reverse" : "flex-row")}
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
              ? "px-4 py-2.5 rounded-2xl rounded-tr-md bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow"
              : "w-full px-1 py-0.5"
          )}
        >
          {isUser ? (
            <>
              <ImageGrid images={images} onOpen={setLightboxIndex} />
              {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            </>
          ) : isStreaming && isLast && !message.content && !message.error ? (
            <div className="typing-indicator" role="status" aria-label="AI đang trả lời">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <>
              {(message.content || !message.error) && (
                <div
                  ref={markdownRef}
                  className={clsx("markdown-body", isStreaming && isLast && !message.error && "typing-cursor")}
                >
                  <MarkdownContent content={message.content} />
                </div>
              )}
              {message.sources?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-edge-light dark:border-edge-dark space-y-1">
                  <p className="text-[11px] font-medium opacity-50">Nguồn tham khảo:</p>
                  {message.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block text-[12px] text-brand-500 hover:underline truncate">
                      [{i + 1}] {s.title}
                    </a>
                  ))}
                </div>
              )}
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
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Tooltip label="Sửa tin nhắn">
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Sửa tin nhắn"
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Pencil size={14} className="opacity-60" />
              </button>
            </Tooltip>
          </div>
        )}

        {!isUser && message.content && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip label={copied ? "Đã sao chép" : "Sao chép"}>
<button onClick={handleCopy} aria-label="Sao chép câu trả lời" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
              {copied ? <Check size={14} className="text-ion-500" /> : <Copy size={14} className="opacity-60" />}
            </button>
</Tooltip>
            {isLast && (
              <Tooltip label="Tạo lại câu trả lời">
<button onClick={onRegenerate} aria-label="Tạo lại câu trả lời" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <RotateCcw size={14} className="opacity-60" />
              </button>
</Tooltip>
            )}
            <Tooltip label="Thích">
<button
              onClick={() => onFeedback(message._id, message.feedback === "like" ? null : "like")}
              aria-label="Thích câu trả lời"
              aria-pressed={message.feedback === "like"}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ThumbsUp size={14} className={message.feedback === "like" ? "text-ion-500 fill-ion-500" : "opacity-60"} />
            </button>
</Tooltip>
            <Tooltip label="Không thích">
<button
              onClick={() => onFeedback(message._id, message.feedback === "dislike" ? null : "dislike")}
              aria-label="Không thích câu trả lời"
              aria-pressed={message.feedback === "dislike"}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ThumbsDown size={14} className={message.feedback === "dislike" ? "text-red-500 fill-red-500" : "opacity-60"} />
            </button>
</Tooltip>
            {message.provider && <span className="text-[11px] opacity-40 ml-1 capitalize">{message.provider}</span>}
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