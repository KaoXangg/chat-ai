import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Send, Square, Paperclip, Globe, X, ImagePlus } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";
import Tooltip from "./Tooltip.jsx";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 4;

export default function ChatInput({ onSend, isStreaming, disabled = false, onStop, allowImage = false }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [images, setImages] = useState([]); // [{ id, previewUrl, mimeType, data }]
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const toast = useToast();

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleInput = (e) => {
    setValue(e.target.value);
    resizeTextarea();
  };

  const addFiles = (fileList) => {
    if (!allowImage || disabled) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.warning(`Chỉ được đính kèm tối đa ${MAX_IMAGES} ảnh mỗi tin nhắn.`);
      return;
    }

    const toProcess = files.slice(0, room);
    if (files.length > room) {
      toast.warning(`Chỉ được đính kèm tối đa ${MAX_IMAGES} ảnh — đã bỏ qua ${files.length - room} ảnh thừa.`);
    }

    toProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" không phải là ảnh.`);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" vượt quá 6MB.`);
        return;
      }

      const reader = new FileReader();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        setImages((prev) => [...prev, { id, previewUrl: dataUrl, mimeType: file.type, data: base64 }]);
      };
      reader.onerror = () => toast.error(`Không thể đọc ảnh "${file.name}".`);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
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
      if (e.dataTransfer?.files?.length) toast.warning("Chọn một mô hình hỗ trợ hình ảnh (Vision) để đính kèm ảnh.");
      return;
    }
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && images.length === 0) || isStreaming) return;
    onSend(trimmed || "Mô tả (những) hình ảnh này.", {
      images: images.map(({ mimeType, data }) => ({ mimeType, data })),
      useWebSearch: webSearchEnabled,
    });
    setValue("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
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

  return (
    <div className="relative px-4 pb-5 pt-2">
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
              className="absolute -inset-2 z-10 rounded-[2rem] border-2 border-dashed border-brand-400 bg-brand-500/10 backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-300 pointer-events-none"
            >
              <ImagePlus size={18} /> Thả ảnh vào đây
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
                  alt="Ảnh đính kèm"
                  className="h-16 w-16 rounded-xl object-cover border border-edge-light dark:border-edge-dark"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  aria-label="Xóa ảnh đính kèm"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Thêm ảnh"
                className="h-16 w-16 rounded-xl border border-dashed border-edge-light dark:border-edge-dark flex items-center justify-center opacity-50 hover:opacity-90 hover:border-brand-400 transition-colors"
              >
                <ImagePlus size={18} />
              </button>
            )}
          </div>
        )}

        <div
          className={clsx(
            "flex items-end gap-2 rounded-3xl glass border px-3 py-2.5 transition-all duration-300",
            focused ? "border-brand-400/70 shadow-glow" : "border-edge-light dark:border-edge-dark"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            aria-label="Chọn hình ảnh đính kèm"
          />
          <Tooltip label={allowImage ? `Đính kèm hình ảnh (tối đa ${MAX_IMAGES})` : "Chọn mô hình hỗ trợ hình ảnh (Vision) để đính kèm ảnh"} side="top" align="start" className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none">
<button
            onClick={() => allowImage && fileInputRef.current?.click()}
            disabled={!allowImage || disabled || images.length >= MAX_IMAGES}
            aria-label={allowImage ? "Đính kèm hình ảnh" : "Đính kèm hình ảnh (chỉ khả dụng với mô hình hỗ trợ hình ảnh)"}
            className="shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <Paperclip size={17} />
          </button>
</Tooltip>

          <Tooltip label="Tìm kiếm thông tin trên web trước khi trả lời" side="top" align="start" className="inline-flex shrink-0 [&>button:disabled]:pointer-events-none">
<button
            onClick={() => setWebSearchEnabled((v) => !v)}
            disabled={disabled}
            aria-label="Bật/tắt tìm kiếm web"
            aria-pressed={webSearchEnabled}
            className={clsx(
              "shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-30",
              webSearchEnabled ? "bg-brand-500/15 text-brand-500" : "hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <Globe size={17} />
          </button>
</Tooltip>

          <label htmlFor="chat-input-textarea" className="sr-only">
            Nhập câu hỏi
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
            placeholder="Nhập câu hỏi của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
            className="flex-1 resize-none bg-transparent outline-none text-[15px] py-2 max-h-48 placeholder:text-black/40 dark:placeholder:text-white/40"
          />
          <Tooltip
            label={isStreaming ? "Dừng trả lời" : "Gửi"}
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
                className="shrink-0 w-10 h-10 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                aria-label="Dừng trả lời"
              >
                <Square size={16} />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSubmit}
                disabled={(!value.trim() && images.length === 0) || disabled}
                className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 disabled:opacity-30 text-white flex items-center justify-center"
                aria-label="Gửi tin nhắn"
              >
                <Send size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          </Tooltip>
        </div>
      </div>
      <p className="text-center text-xs text-black/30 dark:text-white/30 mt-2.5">
        Chat AI có thể trả lời sai. Hãy kiểm tra lại thông tin quan trọng.
      </p>
    </div>
  );
}