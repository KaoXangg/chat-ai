import { useCallback, useRef, useState } from "react";
import api from "../api/axios.js";

/**
 * Lỗi xảy ra TRƯỚC khi máy chủ bắt đầu stream (HTTP 4xx/5xx, mất mạng khi gửi...).
 * Khi đó máy chủ chưa lưu/thay đổi gì nên client có thể gửi lại nguyên yêu cầu.
 */
class StreamRequestError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const NETWORK_MESSAGE = "Không thể kết nối với máy chủ. Hãy kiểm tra mạng rồi thử lại.";
const INTERRUPTED_MESSAGE = "Kết nối bị gián đoạn khi đang nhận câu trả lời.";

/**
 * handlers.onError(message, code, { preStream, userMessageId })
 *  - preStream: true nếu lỗi xảy ra trước khi stream bắt đầu.
 *  - userMessageId: id thật của tin nhắn người dùng (nếu máy chủ đã lưu).
 */
export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const abortRef = useRef(null);

  const runSSE = useCallback(async (url, body, { onToken, onDone, onError } = {}) => {
    setIsStreaming(true);
    setStreamError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let started = false;

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
        throw new StreamRequestError(NETWORK_MESSAGE, "NETWORK_ERROR");
      }

      if (res.status === 401) {
        // Same behaviour as the axios interceptor: expired/invalid token -> back to login.
        localStorage.removeItem("chatai_token");
        localStorage.removeItem("chatai_user");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        throw new StreamRequestError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "UNAUTHORIZED");
      }

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null);
        throw new StreamRequestError(
          errJson?.error?.message || "Không thể kết nối với máy chủ.",
          errJson?.error?.code || (res.status === 429 ? "RATE_LIMITED" : "REQUEST_FAILED")
        );
      }

      started = true;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
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

          if (data.token) onToken?.(data.token);
          if (data.error) {
            finished = true;
            const message = typeof data.error === "string" ? data.error : data.error?.message || "Đã xảy ra lỗi.";
            setStreamError(message);
            onError?.(message, data.code || "PROVIDER_UNAVAILABLE", { preStream: false, userMessageId: data.userMessageId });
          }
          if (data.done) {
            finished = true;
            onDone?.(data);
          }
        }
      }

      // Kết nối đóng mà chưa nhận được done/error -> coi như bị gián đoạn.
      if (!finished) {
        setStreamError(INTERRUPTED_MESSAGE);
        onError?.(INTERRUPTED_MESSAGE, "NETWORK_ERROR", { preStream: false });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        const preStream = !started;
        const isRequestError = err instanceof StreamRequestError;
        const message = isRequestError ? err.message : preStream ? NETWORK_MESSAGE : INTERRUPTED_MESSAGE;
        const code = isRequestError ? err.code : "NETWORK_ERROR";
        setStreamError(message);
        onError?.(message, code, { preStream });
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(
    (conversationId, content, options, handlers) => {
      const base = api.defaults.baseURL;
      return runSSE(
        `${base}/chat/${conversationId}/stream`,
        { content, images: options?.images || [], useWebSearch: Boolean(options?.useWebSearch) },
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