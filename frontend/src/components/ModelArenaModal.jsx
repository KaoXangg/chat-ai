import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Scale,
  X,
  Send,
  Square,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  Brain,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import api from "../api/axios.js";
import { extractReasoning } from "./MessageBubble.jsx";
import { preprocessMath } from "../utils/mathPreprocess.js";

const ARENA_SAMPLE_PROMPTS = [
  "So sánh kiến trúc Microservices và Monolith kèm bảng ưu/nhược điểm thực tế",
  "Viết hàm JavaScript chống dội (debounce) và tiết lưu (throttle) kèm giải thích ngắn gọn",
  "Giải bài toán: Có 3 hộp nhãn sai hoàn toàn (Táo, Cam, Hỗn hợp). Chỉ bốc 1 quả từ 1 hộp, làm sao dán lại nhãn đúng?",
];

async function streamArenaSide({ prompt, provider, model, signal, onToken, onDone, onError }) {
  const base = api.defaults.baseURL || "/api";
  const token = localStorage.getItem("chatai_token");

  try {
    const res = await fetch(`${base}/chat/arena-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: prompt, provider, model }),
      signal,
    });

    if (!res.ok || !res.body) {
      let msg = `Lỗi HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body.error?.message || msg;
      } catch {
        /* ignore */
      }
      onError?.(msg);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        for (const rawLine of part.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.token) onToken?.(payload.token);
            if (payload.done) onDone?.(payload);
            if (payload.error) onError?.(payload.error);
          } catch {
            /* ignore malformed line */
          }
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    onError?.(err.message || "Lỗi kết nối máy chủ");
  }
}

function ArenaColumn({ title, badgeColor, selectedKey, onSelectModel, availableModels, state, onPickWinner, savingWinner }) {
  const { reasoning, cleanContent, isThinkingNow } = useMemo(
    () => extractReasoning(state.content),
    [state.content]
  );
  const processedMarkdown = useMemo(() => preprocessMath(cleanContent || " "), [cleanContent]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#13151f] overflow-hidden min-h-[340px] max-h-[58vh]">
      {/* Header chọn Model */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={clsx("px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider shrink-0", badgeColor)}>
            {title}
          </span>
          <select
            value={selectedKey}
            onChange={(e) => onSelectModel(e.target.value)}
            disabled={state.streaming}
            aria-label={`Chọn mô hình cho ${title}`}
            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none truncate cursor-pointer"
          >
            {availableModels.map((m) => {
              const key = `${m.provider}::${m.modelId}`;
              return (
                <option key={key} value={key} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {m.displayName || m.modelId} ({String(m.provider).toUpperCase()})
                </option>
              );
            })}
          </select>
        </div>

        {/* Telemetry badges */}
        <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
          {state.telemetry?.tokensPerSec > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
              <Zap size={10} /> {state.telemetry.tokensPerSec} tok/s
            </span>
          )}
          {state.telemetry?.durationMs > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[10px]">
              <Clock size={10} /> {(state.telemetry.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Nội dung phản hồi */}
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
        {!state.content && !state.streaming && !state.error ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-zinc-400 dark:text-zinc-500 py-12">
            <Scale size={26} className="mb-2 opacity-40" />
            <p>Sẵn sàng nhận câu hỏi để đấu đối kháng trực tiếp.</p>
          </div>
        ) : (
          <>
            {(reasoning || isThinkingNow) && (
              <div className="mb-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.05] px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-300 mb-1">
                  <Brain size={13} className={clsx(isThinkingNow && "animate-pulse")} />
                  <span>{isThinkingNow ? "Đang suy luận..." : "Tóm tắt suy luận"}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {reasoning || "..."}
                </div>
              </div>
            )}

            {cleanContent ? (
              <div className={clsx("markdown-body text-[14px]", state.streaming && "typing-cursor")}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}>
                  {processedMarkdown}
                </ReactMarkdown>
              </div>
            ) : state.streaming ? (
              <div className="typing-indicator py-2">
                <span />
                <span />
                <span />
              </div>
            ) : null}

            {state.error && (
              <div className="mt-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer chọn câu trả lời thắng cuộc */}
      {state.content && !state.streaming && !state.error && (
        <div className="px-3.5 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            {state.telemetry?.totalTokens ? `${state.telemetry.totalTokens} tokens` : "Hoàn tất"}
          </span>
          <button
            type="button"
            disabled={savingWinner}
            onClick={onPickWinner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Trophy size={13} />
            <span>Chọn câu trả lời này</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ModelArenaModal({ open, onClose, models = [], currentSelection, onSaveWinner }) {
  const availableModels = useMemo(() => models.filter((m) => m.available !== false), [models]);

  const [modelAKey, setModelAKey] = useState("");
  const [modelBKey, setModelBKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [savingWinner, setSavingWinner] = useState(false);

  const [sideA, setSideA] = useState({ content: "", streaming: false, error: null, telemetry: null });
  const [sideB, setSideB] = useState({ content: "", streaming: false, error: null, telemetry: null });

  const abortRef = useRef(null);

  useEffect(() => {
    if (!open || availableModels.length === 0) return;
    const first =
      availableModels.find(
        (m) => m.provider === currentSelection?.provider && m.modelId === currentSelection?.model
      ) || availableModels[0];
    const second =
      availableModels.find((m) => !(m.provider === first.provider && m.modelId === first.modelId)) ||
      first;

    if (!modelAKey) setModelAKey(`${first.provider}::${first.modelId}`);
    if (!modelBKey) setModelBKey(`${second.provider}::${second.modelId}`);
  }, [open, availableModels, currentSelection, modelAKey, modelBKey]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort?.();
    }
  }, [open]);

  if (!open) return null;

  const isAnyStreaming = sideA.streaming || sideB.streaming;

  const parseKey = (key) => {
    const [provider, ...rest] = String(key || "").split("::");
    return { provider: provider || "groq", model: rest.join("::") || "llama-3.3-70b-versatile" };
  };

  const handleRunArena = async (customPrompt) => {
    const text = (typeof customPrompt === "string" ? customPrompt : prompt).trim();
    if (!text || isAnyStreaming) return;

    setLastSubmittedPrompt(text);
    if (typeof customPrompt === "string") setPrompt(text);

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    const selA = parseKey(modelAKey);
    const selB = parseKey(modelBKey);

    setSideA({ content: "", streaming: true, error: null, telemetry: null });
    setSideB({ content: "", streaming: true, error: null, telemetry: null });

    await Promise.all([
      streamArenaSide({
        prompt: text,
        provider: selA.provider,
        model: selA.model,
        signal: controller.signal,
        onToken: (tok) => setSideA((prev) => ({ ...prev, content: prev.content + tok })),
        onDone: (data) =>
          setSideA((prev) => ({ ...prev, streaming: false, telemetry: data.telemetry || null })),
        onError: (err) => setSideA((prev) => ({ ...prev, streaming: false, error: err })),
      }),
      streamArenaSide({
        prompt: text,
        provider: selB.provider,
        model: selB.model,
        signal: controller.signal,
        onToken: (tok) => setSideB((prev) => ({ ...prev, content: prev.content + tok })),
        onDone: (data) =>
          setSideB((prev) => ({ ...prev, streaming: false, telemetry: data.telemetry || null })),
        onError: (err) => setSideB((prev) => ({ ...prev, streaming: false, error: err })),
      }),
    ]);

    window.dispatchEvent(new Event("quota-updated"));
  };

  const handleStop = () => {
    abortRef.current?.abort?.();
    setSideA((prev) => ({ ...prev, streaming: false }));
    setSideB((prev) => ({ ...prev, streaming: false }));
  };

  const handleChooseWinner = async (sideKey, sideState) => {
    if (!lastSubmittedPrompt || !sideState.content || savingWinner) return;
    const { provider, model } = parseKey(sideKey);
    setSavingWinner(true);
    try {
      await onSaveWinner?.({
        prompt: lastSubmittedPrompt,
        answer: sideState.content,
        provider,
        model,
      });
      onClose();
    } finally {
      setSavingWinner(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[135] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Đấu trường So sánh 2 Mô hình AI (Split Model Arena)"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl rounded-3xl bg-white dark:bg-[#161822] border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                <Scale size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Đấu trường So sánh 2 Mô hình AI (Model Arena)</span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300">
                    Side-by-Side Live Stream
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Gửi 1 câu hỏi cho 2 mô hình cùng lúc để đối chiếu tốc độ (tok/s), lập luận và chọn câu trả lời tốt nhất.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ so sánh"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2 Cột đối kháng */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ArenaColumn
                title="Model A"
                badgeColor="bg-brand-500/15 text-brand-600 dark:text-brand-300"
                selectedKey={modelAKey}
                onSelectModel={setModelAKey}
                availableModels={availableModels}
                state={sideA}
                savingWinner={savingWinner}
                onPickWinner={() => handleChooseWinner(modelAKey, sideA)}
              />
              <ArenaColumn
                title="Model B"
                badgeColor="bg-teal-500/15 text-teal-600 dark:text-teal-300"
                selectedKey={modelBKey}
                onSelectModel={setModelBKey}
                availableModels={availableModels}
                state={sideB}
                savingWinner={savingWinner}
                onPickWinner={() => handleChooseWinner(modelBKey, sideB)}
              />
            </div>

            {/* Gợi ý câu hỏi nhanh */}
            {!sideA.content && !sideB.content && !isAnyStreaming && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 me-1">
                  <Sparkles size={13} /> Đề bài thử nghiệm nhanh:
                </span>
                {ARENA_SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunArena(sample)}
                    className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:border-brand-500/50 hover:text-brand-600 dark:hover:text-brand-300 text-zinc-600 dark:text-zinc-300 transition-colors text-start"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thanh nhập câu hỏi chung */}
          <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleRunArena();
                  }
                }}
                disabled={isAnyStreaming}
                placeholder="Nhập câu hỏi để cả 2 mô hình AI cùng trả lời song song..."
                className="flex-1 px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500"
              />
              {isAnyStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <Square size={14} />
                  <span>Dừng</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRunArena()}
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-all shrink-0"
                >
                  <Send size={14} />
                  <span>So sánh ngay</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
