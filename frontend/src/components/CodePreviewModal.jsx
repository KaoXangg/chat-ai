import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  RotateCw, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Download,
  Columns,
  Eye,
  Code2
} from "lucide-react";
import clsx from "clsx";
import { useToast } from "../context/ToastContext.jsx";

/**
 * Chuẩn bị HTML đầy đủ để hiển thị an toàn và đẹp nhất trong Sandbox iframe
 */
export function preparePreviewDoc(code, language = "html") {
  if (!code) return "";
  const trimmed = code.trim();
  const langLower = String(language || "html").toLowerCase();

  // Nếu là sơ đồ Mermaid
  if (langLower === "mermaid" || /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)\b/i.test(trimmed)) {
    const escapedMermaid = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .mermaid {
      background: #ffffff;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      max-width: 100%;
      overflow: auto;
    }
  </style>
</head>
<body>
  <pre class="mermaid">${escapedMermaid}</pre>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "default", securityLevel: "loose" });
  </script>
</body>
</html>`;
  }

  // Nếu là file SVG
  if (trimmed.startsWith("<svg") || langLower === "svg") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 24px;
      box-sizing: border-box;
    }
    svg {
      max-width: 100%;
      max-height: 80vh;
      height: auto;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.06));
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
  }

  // Nếu đã là trang HTML đầy đủ
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    if (!trimmed.includes("cdn.tailwindcss.com") && trimmed.includes("class=")) {
      return trimmed.replace(
        /<head([^>]*)>/i,
        `<head$1>\n  <script src="https://cdn.tailwindcss.com"></script>`
      );
    }
    return trimmed;
  }

  // Nếu là đoạn mã HTML / component snippet
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
}

/**
 * Modal xem trước trực tiếp mã HTML/SVG/CSS/JS/Mermaid (Live Sandbox Preview - giống Claude Artifacts / Canvas)
 */
export default function CodePreviewModal({ open, onClose, code, language = "html" }) {
  const [device, setDevice] = useState("desktop"); // "desktop" | "tablet" | "mobile"
  const [viewMode, setViewMode] = useState("preview"); // "preview" | "split" | "code"
  const [editableCode, setEditableCode] = useState(code || "");
  const [key, setKey] = useState(0); // Dùng để reload iframe
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setEditableCode(code || "");
  }, [code, open]);

  const previewDoc = preparePreviewDoc(editableCode, language);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableCode);
      setCopied(true);
      toast.success("Đã sao chép mã nguồn!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép.");
    }
  };

  const handleDownload = () => {
    const langLower = String(language || "html").toLowerCase();
    const ext = langLower === "svg" ? "svg" : langLower === "mermaid" ? "mmd" : "html";
    const mime = ext === "svg" ? "image/svg+xml" : "text/html;charset=utf-8";
    const payload = ext === "html" ? previewDoc : editableCode;
    const blob = new Blob([payload], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống tệp .${ext}`);
  };

  const handleReload = () => {
    setKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    const blob = new Blob([previewDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Kích thước thiết bị xem trước
  const deviceWidth =
    device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "w-full";

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-[94vh] max-w-6xl flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        >
          {/* Header thanh điều khiển */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 shrink-0 gap-2 flex-wrap">
            {/* Tiêu đề & Tag */}
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500">
                <Sparkles size={16} />
              </span>
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Artifact Canvas <span className="text-xs font-mono font-normal px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">{language}</span>
                </span>
              </div>
            </div>

            {/* Chế độ hiển thị (Preview / Split / Code) & Responsive Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                    viewMode === "preview"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Chỉ xem giao diện"
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={clsx(
                    "hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                    viewMode === "split"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Xem song song Mã nguồn & Giao diện (Canvas)"
                >
                  <Columns size={13} /> Split
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("code")}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                    viewMode === "code"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Chỉnh sửa mã nguồn trực tiếp"
                >
                  <Code2 size={13} /> Code
                </button>
              </div>

              {viewMode === "preview" && (
                <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 text-xs">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                      device === "desktop"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                    title="Màn hình Desktop (100%)"
                  >
                    <Monitor size={14} /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("tablet")}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                      device === "tablet"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                    title="Màn hình Tablet (768px)"
                  >
                    <Tablet size={14} /> Tablet
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                      device === "mobile"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                    title="Màn hình Điện thoại (390px)"
                  >
                    <Smartphone size={14} /> Mobile
                  </button>
                </div>
              )}
            </div>

            {/* Công cụ thao tác bên phải */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReload}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Tải lại giao diện"
              >
                <RotateCw size={15} />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Sao chép toàn bộ mã"
              >
                {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Tải tệp xuống máy"
              >
                <Download size={15} />
              </button>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Mở trong tab trình duyệt mới"
              >
                <ExternalLink size={15} />
              </button>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Đóng xem trước"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Vùng hiển thị Sandbox Preview / Split / Code */}
          <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-950 flex overflow-hidden">
            {(viewMode === "code" || viewMode === "split") && (
              <div
                className={clsx(
                  "h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100",
                  viewMode === "split" ? "w-1/2" : "w-full"
                )}
              >
                <div className="px-3 py-1.5 text-[11px] font-mono text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                  <span>Trình sửa mã trực tiếp (Live Editor)</span>
                  <button
                    type="button"
                    onClick={() => setEditableCode(code || "")}
                    className="hover:text-white underline"
                  >
                    Khôi phục gốc
                  </button>
                </div>
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full p-4 bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                />
              </div>
            )}

            {(viewMode === "preview" || viewMode === "split") && (
              <div
                className={clsx(
                  "h-full flex items-center justify-center p-2 sm:p-4 overflow-auto",
                  viewMode === "split" ? "w-1/2" : "w-full"
                )}
              >
                <div
                  className={clsx(
                    "h-full w-full bg-white rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300",
                    viewMode === "preview" ? deviceWidth : "w-full"
                  )}
                >
                  <iframe
                    key={key}
                    srcDoc={previewDoc}
                    title="Code Preview Sandbox"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
