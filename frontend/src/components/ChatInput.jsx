import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Send, Square, Paperclip, Globe, X, ImagePlus, Mic, MicOff, FileText, Sparkles } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";
import Tooltip from "./Tooltip.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import PromptMenu from "./PromptMenu.jsx";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 4;
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_DOCS = 3;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/heic", "image/heif", "image/avif"]);
const DOC_EXTS = new Set(["txt", "md", "csv", "json", "pdf", "js", "py", "html", "css", "ts", "jsx", "tsx", "log"]);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatInput({ onSend, isStreaming, disabled = false, onStop, allowImage = false, restoredText = "" }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [images, setImages] = useState([]); // [{ id, previewUrl, mimeType, data }]
  const [documents, setDocuments] = useState([]); // [{ id, name, size, content }]
  const [pendingImages, setPendingImages] = useState(0);
  const [isPromptMenuOpen, setIsPromptMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const imagesRef = useRef([]);
  const readersRef = useRef(new Map());
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const voiceBaseTextRef = useRef("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const toast = useToast();
  const { t, lang } = useI18n();

  const updateImages = (update) => {
    imagesRef.current = typeof update === "function" ? update(imagesRef.current) : update;
    setImages(imagesRef.current);
  };

  useEffect(() => {
    if (restoredText) {
      setValue(restoredText);
      setTimeout(() => {
        resizeTextarea();
        textareaRef.current?.focus();
      }, 50);
    }
  }, [restoredText]);

  useEffect(() => {
    return () => {
      for (const reader of readersRef.current.values()) reader.abort();
      readersRef.current.clear();
      recognitionRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (allowImage) return;
    const readers = [...readersRef.current.values()];
    readersRef.current.clear();
    readers.forEach(reader => reader.abort());
    setPendingImages(0);
    updateImages([]);
  }, [allowImage]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setValue(val);
    resizeTextarea();

    if (val.startsWith("/")) {
      setSlashQuery(val);
      setIsPromptMenuOpen(true);
    } else if (isPromptMenuOpen) {
      setIsPromptMenuOpen(false);
    }
  };

  const handleSelectPrompt = (prompt) => {
    setIsPromptMenuOpen(false);
    setValue(prompt.template);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const pStart = prompt.template.indexOf("[");
        const pEnd = prompt.template.indexOf("]");
        if (pStart !== -1 && pEnd !== -1) {
          el.setSelectionRange(pStart, pEnd + 1);
        } else {
          el.setSelectionRange(prompt.template.length, prompt.template.length);
        }
        resizeTextarea();
      }
    }, 50);
  };

  const addFiles = (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;

    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isImg = IMAGE_TYPES.has(file.type.toLowerCase()) || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);

      if (isImg) {
        if (!allowImage) {
          toast.warning("Mô hình đang chọn không hỗ trợ xử lý ảnh. Bạn vẫn có thể đính kèm tài liệu văn bản (.txt, .md, .csv, .json, .pdf).");
          return;
        }
        const room = MAX_IMAGES - imagesRef.current.length - readersRef.current.size;
        if (room <= 0) {
          toast.warning(t("input.maxImages", { max: MAX_IMAGES }));
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(t("input.tooLarge", { name: file.name }));
          return;
        }

        const reader = new FileReader();
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        readersRef.current.set(id, reader);
        setPendingImages(readersRef.current.size);
        const finish = () => {
          if (!readersRef.current.delete(id)) return false;
          setPendingImages(readersRef.current.size);
          return true;
        };
        reader.onload = () => {
          if (!finish()) return;
          const dataUrl = reader.result;
          const base64 = dataUrl.split(",")[1];
          updateImages((prev) => [...prev, { id, previewUrl: dataUrl, mimeType: file.type.toLowerCase() || "image/jpeg", data: base64 }]);
        };
        reader.onerror = () => { if (finish()) toast.error(t("input.readFail", { name: file.name })); };
        reader.onabort = finish;
        reader.readAsDataURL(file);
      } else {
        // Tệp văn bản / tài liệu
        if (documents.length >= MAX_DOCS) {
          toast.warning(`Chỉ có thể đính kèm tối đa ${MAX_DOCS} tài liệu mỗi tin nhắn.`);
          return;
        }
        if (file.size > MAX_DOC_BYTES) {
          toast.error(`Tài liệu "${file.name}" quá lớn (tối đa 5MB).`);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result;
          setDocuments((prev) => [
            ...prev,
            { id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, content },
          ]);
        };
        reader.onerror = () => toast.error(`Không thể đọc tệp ${file.name}`);
        reader.readAsText(file);
      }
    });
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (id) => {
    updateImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleDragEnter = (e) => {
    if (!allowImage || disabled) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) setIsDraggingOver(true);
  };

  const handleDragOver = (e) => {
    if (!allowImage || disabled) return;
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (!allowImage || disabled) {
      if (e.dataTransfer?.files?.length) toast.warning(t("input.needVision"));
      return;
    }
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && imagesRef.current.length === 0 && documents.length === 0) || isStreaming || disabled || readersRef.current.size) return;

    let sendContent = trimmed;
    if (documents.length > 0) {
      const docSections = documents
        .map((d) => `--- Tệp đính kèm: "${d.name}" ---\n${d.content}\n---`)
        .join("\n\n");
      sendContent = `${docSections}\n\n${trimmed || "Hãy phân tích nội dung các tệp đính kèm trên."}`;
    }

    onSend(sendContent || t("input.describe"), {
      images: allowImage ? imagesRef.current.map(({ mimeType, data }) => ({ mimeType, data })) : [],
      useWebSearch: webSearchEnabled,
    });
    setValue("");
    updateImages([]);
    setDocuments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    if (isPromptMenuOpen && (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      return;
    }
    if (isPromptMenuOpen && e.key === "Escape") {
      e.preventDefault();
      setIsPromptMenuOpen(false);
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleVoice = () => {
    if (disabled || isStreaming) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning(t("profile.micNotSupported"));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === "en" ? "en-US" : lang === "ja" ? "ja-JP" : "vi-VN";

      voiceBaseTextRef.current = value;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const speechPart = (finalTranscript + interimTranscript).trim();
        const base = voiceBaseTextRef.current ? voiceBaseTextRef.current.trim() : "";
        const combined = base ? (speechPart ? `${base} ${speechPart}` : base) : speechPart;

        setValue(combined);
        resizeTextarea();
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          toast.error(t("profile.micPermissionDenied"));
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        voiceBaseTextRef.current = "";
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="chat-composer-shell relative px-4 pt-2">
      <div
        className="max-w-3xl mx-auto relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence>
          {isDraggingOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-2 z-10 rounded-[2rem] border-2 border-dashed border-brand-400 bg-brand-500/10 backdrop-blur-xs flex items-center justify-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-300 pointer-events-none"
            >
              <ImagePlus size={18} /> {t("input.dropHere")}
            </motion.div>
          )}
        </AnimatePresence>

        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative"
              >
                <img
                  src={img.previewUrl}
                  alt={t("input.imageAlt")}
                  className="h-16 w-16 rounded-xl object-cover border border-edge-light dark:border-edge-dark"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  aria-label={t("input.removeImage")}
                  className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
            {images.length + pendingImages < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || !allowImage}
                aria-label={t("input.addImage")}
                className="h-16 w-16 rounded-xl border border-dashed border-edge-light dark:border-edge-dark flex items-center justify-center opacity-50 hover:opacity-90 hover:border-brand-400 transition-colors"
              >
                <ImagePlus size={18} />
              </button>
            )}
          </div>
        )}

        {documents.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 shadow-sm"
              >
                <FileText size={14} className="text-brand-500 shrink-0" />
                <span className="font-medium truncate max-w-[140px]" title={doc.name}>
                  {doc.name}
                </span>
                <span className="text-[10px] text-zinc-400">({formatSize(doc.size)})</span>
                <button
                  type="button"
                  onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Menu gợi ý lệnh nhanh & Prompt mẫu */}
        <PromptMenu
          isOpen={isPromptMenuOpen}
          filterQuery={slashQuery}
          onSelectPrompt={handleSelectPrompt}
          onClose={() => setIsPromptMenuOpen(false)}
        />

        <div
          className={clsx(
            "chat-composer",
            focused && "is-focused"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.pdf,.js,.py,.html,.css,.ts,.jsx,.tsx,.log"
            multiple
            className="hidden"
            onChange={handleFileChange}
            aria-label={t("input.fileLabel")}
          />

          <label htmlFor="chat-input-textarea" className="sr-only">
            {t("input.label")}
          </label>
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              if (!allowImage) return;
              const files = Array.from(e.clipboardData?.files || []);
              if (files.length) addFiles(files);
            }}
            disabled={disabled}
            rows={1}
            maxLength={32000}
            dir="auto"
            placeholder={t("input.prompt") + " (Gõ / để mở prompt mẫu...)"}
            className="w-full resize-none bg-transparent outline-none border-0 text-[15px] leading-relaxed py-1 max-h-48 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-0"
          />

          <div className="chat-composer-toolbar">
            <div className="chat-composer-actions">
              <Tooltip
                label={allowImage ? "Đính kèm ảnh hoặc tài liệu (.txt, .md, .csv, .json, .pdf)" : "Đính kèm tài liệu (.txt, .md, .csv, .json, .pdf)"}
                side="top"
                align="start"
                className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || (images.length + pendingImages >= MAX_IMAGES && documents.length >= MAX_DOCS)}
                  aria-label="Đính kèm tệp"
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
                >
                  <Paperclip size={16} />
                </button>
              </Tooltip>

              <Tooltip label={t("input.webTip")} side="top" align="start" className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none">
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled((v) => !v)}
                  disabled={disabled}
                  aria-label={t("input.webAria")}
                  aria-pressed={webSearchEnabled}
                  className={clsx(
                    "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30",
                    webSearchEnabled
                      ? "bg-brand-500/15 text-brand-500 font-semibold"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <Globe size={16} />
                </button>
              </Tooltip>

              <Tooltip
                label={isListening ? t("profile.micListening") : "Nhập bằng giọng nói"}
                side="top"
                align="start"
                className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none"
              >
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={disabled || isStreaming}
                  aria-label="Microphone Voice Input"
                  aria-pressed={isListening}
                  className={clsx(
                    "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30",
                    isListening
                      ? "bg-red-500/20 text-red-500 dark:text-red-400 ring-2 ring-red-500/40 animate-pulse"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </Tooltip>

              <Tooltip label="Lệnh nhanh & Thư viện Prompt (/)" side="top" align="start" className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    setIsPromptMenuOpen((v) => !v);
                    setSlashQuery("");
                  }}
                  disabled={disabled}
                  aria-label="Prompt Library"
                  className={clsx(
                    "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30",
                    isPromptMenuOpen
                      ? "bg-brand-500/20 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500/30"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <Sparkles size={16} />
                </button>
              </Tooltip>
            </div>

            <Tooltip
              label={isStreaming ? t("input.stop") : t("input.send")}
              shortcut={isStreaming ? undefined : "Enter"}
              side="top"
              align="end"
              className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isStreaming ? (
                  <motion.button
                    key="stop"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onStop}
                    className="shrink-0 w-8 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xs"
                    aria-label={t("input.stop")}
                  >
                    <Square size={13} />
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSubmit}
                    disabled={(!value.trim() && images.length === 0 && documents.length === 0) || disabled || pendingImages > 0}
                    className="shrink-0 w-8 h-8 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-xs active:scale-95"
                    aria-label={t("input.sendAria")}
                  >
                    <Send size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </Tooltip>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-black/30 dark:text-white/30 mt-2.5">
        {t("input.disclaimer")}
      </p>
    </div>
  );
}
