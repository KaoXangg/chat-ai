import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import { handleSessionError } from "../api/session.js";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * Lỗi xảy ra TRƯỚC khi máy chủ bắt đầu stream (HTTP 4xx/5xx, mất mạng khi gửi...).
 * Metadata cho biết máy chủ đã lưu hay chưa; mất mạng trước phản hồi vẫn có thể đã lưu.
 */
class StreamRequestError extends Error {
  constructor(message, code, metadata = {}) {
    super(message);
    this.code = code;
    this.metadata = metadata;
  }
}

/**
 * handlers.onError(message, code, { preStream, userMessageId })
 *  - preStream: true nếu chưa nhận stream và máy chủ chưa xác nhận đã lưu.
 *  - uncertain: true nếu mất mạng, cần gửi lại cùng requestId hoặc tải lại dữ liệu.
 *  - userMessageId: id thật của tin nhắn người dùng (nếu máy chủ đã lưu).
 */
export function useChatStream() {
  const { t } = useI18n();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // runSSE là useCallback([]) nên dùng ref để luôn lấy hàm dịch theo ngôn ngữ giao diện hiện tại.
  const tRef = useRef(t);
  tRef.current = t;

  /** Thông báo lỗi theo mã (error.<CODE>) trong ngôn ngữ giao diện; không có thì dùng nội dung server gửi. */
  const messageForCode = (code, serverMessage) => {
    const key = `error.${code}`;
    const translated = tRef.current(key);
    if (translated !== key) return translated;
    return serverMessage || tRef.current("error.generic");
  };

  const runSSE = useCallback(async (url, body, { onToken, onDone, onError, onStart, onStop } = {}) => {
    setIsStreaming(true);
    setStreamError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let started = false;
    let finished = false;

    try {
      const token = localStorage.getItem("chatai_token");
      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new StreamRequestError("", "NETWORK_ERROR");
      }

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null);
        handleSessionError(res.status, errJson?.error?.code);
        throw new StreamRequestError(
          errJson?.error?.message || "",
          errJson?.error?.code || (res.status === 429 ? "RATE_LIMITED" : "REQUEST_FAILED"),
          errJson?.data || {}
        );
      }

      started = true;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          let data;
          try {
            data = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (data.started) onStart?.(data);
          if (data.token) onToken?.(data.token);
          if (data.error) {
            finished = true;
            const code = data.code || "PROVIDER_UNAVAILABLE";
            const serverMessage = typeof data.error === "string" ? data.error : data.error?.message;
            const message = messageForCode(code, serverMessage);
            setStreamError(message);
            onError?.(message, code, { preStream: false, userMessageId: data.userMessageId, messageId: data.messageId, interrupted: data.interrupted });
          }
          if (data.done) {
            finished = true;
            onDone?.(data);
          }
        }
      }

      // Kết nối đóng mà chưa nhận được done/error -> coi như bị gián đoạn.
      if (!finished) {
        const message = tRef.current("chat.stream.interrupted");
        setStreamError(message);
        onError?.(message, "NETWORK_ERROR", { preStream: false });
      }
    } catch (err) {
      if (finished) return;
      if (controller.signal.aborted) {
        onStop?.();
      } else {
        const preStream = !started && !err.metadata?.persisted;
        const isRequestError = err instanceof StreamRequestError;
        const code = isRequestError ? err.code : "NETWORK_ERROR";
        const message =
          isRequestError || preStream
            ? messageForCode(code === "NETWORK_ERROR" ? "NETWORK" : code, isRequestError ? err.message : "")
            : tRef.current("chat.stream.interrupted");
        setStreamError(message);
        onError?.(message, code, { ...err.metadata, preStream, uncertain: code === "NETWORK_ERROR" });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(
    (conversationId, content, options, handlers) => {
      const base = api.defaults.baseURL;
      return runSSE(
        `${base}/chat/${conversationId}/stream`,
        { content, images: options?.images || [], useWebSearch: Boolean(options?.useWebSearch), requestId: options?.requestId },
        handlers
      );
    },
    [runSSE]
  );

  const regenerate = useCallback(
    (conversationId, handlers) => {
      const base = api.defaults.baseURL;
      return runSSE(`${base}/chat/${conversationId}/regenerate`, {}, handlers);
    },
    [runSSE]
  );

  const editMessage = useCallback(
    (conversationId, messageId, content, options, handlers) => {
      const base = api.defaults.baseURL;
      return runSSE(
        `${base}/chat/${conversationId}/edit/${messageId}`,
        { content, useWebSearch: Boolean(options?.useWebSearch) },
        handlers
      );
    },
    [runSSE]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, regenerate, editMessage, stop, isStreaming, streamError };
}
