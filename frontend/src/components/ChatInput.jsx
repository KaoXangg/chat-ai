import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Send, Square, Paperclip, Globe, X, ImagePlus, Mic, MicOff, FileText, Sparkles, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Tooltip from "./Tooltip.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import PromptMenu from "./PromptMenu.jsx";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 4;
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_DOCS = 3;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/heic", "image/heif", "image/avif"]);
const DOC_EXTS = new Set(["txt", "md", "csv", "json", "pdf", "docx", "js", "py", "html", "css", "ts", "jsx", "tsx", "log", "sql", "xml", "yaml", "yml"]);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Nén và thu nhỏ ảnh lớn (> 350KB) trên trình duyệt bằng Canvas (tối đa 1440px, WebP/JPEG 0.82)
 * để giảm dung lượng chuỗi Base64 lưu trong cơ sở dữ liệu.
 */
function compressImageDataUrl(dataUrl, originalMimeType, fileSize) {
  if (!fileSize || fileSize <= 350 * 1024 || originalMimeType === "image/gif") {
    return Promise.resolve({ dataUrl, mimeType: originalMimeType || "image/jpeg" });
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1440;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl, mimeType: originalMimeType || "image/jpeg" });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outMime = "image/webp";
        let compressedUrl = canvas.toDataURL(outMime, 0.82);
        let finalMime = outMime;
        if (!compressedUrl.startsWith("data:image/webp")) {
          finalMime = "image/jpeg";
          compressedUrl = canvas.toDataURL(finalMime, 0.82);
        }
        if (compressedUrl.length < dataUrl.length) {
          resolve({ dataUrl: compressedUrl, mimeType: finalMime });
        } else {
          resolve({ dataUrl, mimeType: originalMimeType || "image/jpeg" });
        }
      } catch {
        resolve({ dataUrl, mimeType: originalMimeType || "image/jpeg" });
      }
    };
    img.onerror = () => resolve({ dataUrl, mimeType: originalMimeType || "image/jpeg" });
    img.src = dataUrl;
  });
}

export default function ChatInput({ onSend, isStreaming, disabled = false, onStop, allowImage = false, restoredText = "" }) {
  const { user } = useAuth();
  const isFreeUser = user?.userTier !== undefined && String(user.userTier).toLowerCase() === "free" && user?.role !== "admin";
  const maxAllowedImages = isFreeUser ? 1 : MAX_IMAGES;

  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [images, setImages] = useState([]); // [{ id, previewUrl, mimeType, data }]
  const [documents, setDocuments] = useState([]); // [{ id, name, size, content }]
  const [pendingImages, setPendingImages] = useState(0);
  const [pendingDocs, setPendingDocs] = useState(0);
  const [isPromptMenuOpen, setIsPromptMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const imagesRef = useRef([]);
  const readersRef = useRef(new Map());
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
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
          toast.warning("Mô hình đang chọn không hỗ trợ xử lý ảnh. Bạn vẫn có thể đính kèm tài liệu (.pdf, .docx, .txt, .md, .csv, .json).");
          return;
        }
        const room = maxAllowedImages - imagesRef.current.length - readersRef.current.size;
        if (room <= 0) {
          toast.warning(
            isFreeUser
              ? "Gói Free chỉ hỗ trợ phân tích tối đa 1 ảnh mỗi tin nhắn. Nâng cấp lên Plus/Premium để gửi tối đa 4 ảnh."
              : t("input.maxImages", { max: maxAllowedImages })
          );
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
        reader.onload = async () => {
          const rawDataUrl = reader.result;
          const { dataUrl, mimeType } = await compressImageDataUrl(
            rawDataUrl,
            file.type.toLowerCase() || "image/jpeg",
            file.size
          );
          if (!finish()) return;
          const base64 = dataUrl.split(",")[1];
          updateImages((prev) => [...prev, { id, previewUrl: dataUrl, mimeType, data: base64 }]);
        };
        reader.onerror = () => { if (finish()) toast.error(t("input.readFail", { name: file.name })); };
        reader.onabort = finish;
        reader.readAsDataURL(file);
      } else {
        // Tệp văn bản / tài liệu (.pdf, .docx, .txt, .md, .csv, .json, code...)
        if (documents.length + pendingDocs >= MAX_DOCS) {
          toast.warning(`Chỉ có thể đính kèm tối đa ${MAX_DOCS} tài liệu mỗi tin nhắn.`);
          return;
        }
        if (file.size > MAX_DOC_BYTES) {
          toast.error(`Tài liệu "${file.name}" quá lớn (tối đa 5MB).`);
          return;
        }

        const isBinaryDoc = ext === "pdf" || ext === "docx";
        if (isBinaryDoc) {
          const reader = new FileReader();
          setPendingDocs((n) => n + 1);
          reader.onload = async () => {
            try {
              const res = await api.post("/chat/extract-document", {
                fileName: file.name,
                mimeType: file.type,
                base64Data: reader.result,
              });
              const extractedText = res.data?.data?.text;
              if (extractedText) {
                setDocuments((prev) => [
                  ...prev,
                  { id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, content: extractedText },
                ]);
              }
            } catch (err) {
              toast.error(err.response?.data?.error?.message || `Không thể trích xuất văn bản từ tệp ${file.name}`);
            } finally {
              setPendingDocs((n) => Math.max(0, n - 1));
            }
          };
          reader.onerror = () => {
            setPendingDocs((n) => Math.max(0, n - 1));
            toast.error(`Không thể đọc tệp ${file.name}`);
          };
          reader.readAsDataURL(file);
        } else {
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

  const handleToggleVoice = async () => {
    if (disabled || isStreaming) return;

    if (isListening) {
      recognitionRef.current?.stop?.();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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
        return;
      } catch {
        setIsListening(false);
      }
    }

    // Fallback: Ghi âm bằng MediaRecorder & chuyển giọng nói qua Groq Whisper API (whisper-large-v3-turbo)
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        voiceBaseTextRef.current = value;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          if (!blob.size) return;

          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const res = await api.post("/chat/transcribe", {
                audioBase64: reader.result,
                mimeType,
                language: lang === "en" ? "en" : lang === "ja" ? "ja" : "vi",
              });
              const text = res.data?.data?.text?.trim();
              if (text) {
                const base = voiceBaseTextRef.current ? voiceBaseTextRef.current.trim() : "";
                setValue(base ? `${base} ${text}` : text);
                setTimeout(resizeTextarea, 20);
              }
            } catch (err) {
              toast.error(err.response?.data?.error?.message || "Không thể chuyển giọng nói thành văn bản.");
            }
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
      } catch {
        toast.error(t("profile.micPermissionDenied"));
        setIsListening(false);
      }
      return;
    }

    toast.warning(t("profile.micNotSupported"));
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
            {images.length + pendingImages < maxAllowedImages && (
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

        {(documents.length > 0 || pendingDocs > 0) && (
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
            {pendingDocs > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-600 dark:text-brand-400">
                <Loader2 size={13} className="animate-spin" />
                <span>Đang trích xuất tài liệu...</span>
              </div>
            )}
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
            focused && "is-focused",
            isStreaming && "is-streaming"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.pdf,.docx,.js,.py,.html,.css,.ts,.jsx,.tsx,.log,.sql,.xml,.yaml,.yml"
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
                label={allowImage ? "Đính kèm ảnh hoặc tài liệu (.pdf, .docx, .txt, .md, .csv, .json)" : "Đính kèm tài liệu (.pdf, .docx, .txt, .md, .csv, .json)"}
                side="top"
                align="start"
                className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || (images.length + pendingImages >= maxAllowedImages && documents.length + pendingDocs >= MAX_DOCS)}
                  aria-label="Đính kèm tệp"
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
                >
                  <Paperclip size={16} />
                </button>
              </Tooltip>

              <Tooltip label={t("input.webTip")} side="top" align="start" className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    if (isFreeUser && !webSearchEnabled) {
                      toast.warning("Tính năng Tìm kiếm Web thời gian thực chỉ dành cho gói Plus và Premium.");
                      return;
                    }
                    setWebSearchEnabled((v) => !v);
                  }}
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

            <div className="flex items-center gap-2">
              {value.length > 0 && (
                <span
                  aria-live="off"
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[10px] font-mono text-zinc-500 dark:text-zinc-400 select-none"
                  title="Số ký tự và ước tính số token của câu hỏi"
                >
                  <span>{value.length.toLocaleString()} ký tự</span>
                  <span>•</span>
                  <span className="text-brand-600 dark:text-brand-400 font-semibold">
                    ~{Math.max(1, Math.ceil(value.length / 4)).toLocaleString()} tok
                  </span>
                </span>
              )}

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
                      disabled={(!value.trim() && images.length === 0 && documents.length === 0) || disabled || pendingImages > 0 || pendingDocs > 0}
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
      </div>
      <p className="text-center text-xs text-black/30 dark:text-white/30 mt-2.5">
        {t("input.disclaimer")}
      </p>
    </div>
  );
}
