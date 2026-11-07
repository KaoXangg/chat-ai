import { useEffect, useState } from "react";
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
  Code2,
  Maximize2,
} from "lucide-react";
import clsx from "clsx";
import { preparePreviewDoc } from "./CodePreviewModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

/**
 * Khung xem trước trực tiếp nằm cạnh khung chat (Side-by-side Artifact Canvas giống Claude / ChatGPT Canvas)
 */
export default function ArtifactSidePanel({
  artifact,
  onClose,
  onExpandModal,
}) {
  const [device, setDevice] = useState("desktop");
  const [viewMode, setViewMode] = useState("preview"); // "preview" | "split" | "code"
  const [editableCode, setEditableCode] = useState(artifact?.code || "");
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (artifact?.code !== undefined) {
      setEditableCode(artifact.code);
      setViewMode("preview");
    }
  }, [artifact?.code, artifact?.language]);

  if (!artifact) return null;

  const language = artifact.language || "html";
  const previewDoc = preparePreviewDoc(editableCode, language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableCode);
      setCopied(true);
      toast.success("Đã sao chép mã nguồn Artifact!");
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

  const handleOpenNewTab = () => {
    const blob = new Blob([previewDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const deviceWidth =
    device === "mobile" ? "max-w-[375px]" : device === "tablet" ? "max-w-[720px]" : "w-full";

  return (
    <aside
      aria-label="Khung xem trước trực tiếp Artifact Canvas"
      className="hidden lg:flex flex-col w-[46%] xl:w-[48%] max-w-[760px] min-w-[400px] h-full border-s border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14161f] z-20 shrink-0 shadow-xl"
    >
      {/* Thanh tiêu đề Artifact Side-Panel */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-brand-500/12 text-brand-500 shrink-0">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                Artifact Canvas
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase shrink-0">
                {language}
              </span>
            </div>
          </div>
        </div>

        {/* Bộ chuyển chế độ Preview / Split / Code */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300/40 dark:border-zinc-700/50 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded-lg transition-all",
                viewMode === "preview"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Eye size={12} /> Xem
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded-lg transition-all",
                viewMode === "split"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Columns size={12} /> Đôi
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded-lg transition-all",
                viewMode === "code"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Code2 size={12} /> Code
            </button>
          </div>

          {viewMode !== "code" && (
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300/40 dark:border-zinc-700/50">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                title="Màn hình máy tính"
                className={clsx(
                  "p-1 rounded-lg transition-all",
                  device === "desktop"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Monitor size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                title="Máy tính bảng"
                className={clsx(
                  "p-1 rounded-lg transition-all",
                  device === "tablet"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Tablet size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                title="Điện thoại"
                className={clsx(
                  "p-1 rounded-lg transition-all",
                  device === "mobile"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Smartphone size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Cụm nút tác vụ */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            title="Chạy lại"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Sao chép mã"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Tải file về máy"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            title="Mở trong tab mới"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={14} />
          </button>
          {onExpandModal && (
            <button
              type="button"
              onClick={() => onExpandModal({ code: editableCode, language })}
              title="Phóng toàn màn hình"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Đóng khung xem trước"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Thân khung hiển thị */}
      <div className="flex-1 min-h-0 flex flex-col bg-zinc-100 dark:bg-zinc-950/80 overflow-hidden">
        {(viewMode === "code" || viewMode === "split") && (
          <div
            className={clsx(
              "flex flex-col bg-[#1e1e24] text-zinc-100 overflow-hidden",
              viewMode === "split"
                ? "h-2/5 border-b border-zinc-300 dark:border-zinc-800"
                : "h-full"
            )}
          >
            <div className="px-3 py-1.5 bg-black/25 border-b border-white/10 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Live Editor ({language.toUpperCase()})</span>
              <span className="text-brand-400">Tự động cập nhật</span>
            </div>
            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-3.5 bg-transparent font-mono text-xs leading-relaxed text-zinc-100 resize-none focus:outline-none"
            />
          </div>
        )}

        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={clsx(
              "flex-1 flex items-center justify-center p-2.5 overflow-auto",
              viewMode === "split" ? "h-3/5" : "h-full"
            )}
          >
            <div
              className={clsx(
                "h-full bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 border border-zinc-200 dark:border-zinc-800",
                deviceWidth
              )}
            >
              <iframe
                key={iframeKey}
                srcDoc={previewDoc}
                title="Artifact Side-Panel Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

