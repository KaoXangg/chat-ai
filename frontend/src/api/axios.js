import axios from "axios";
import { handleSessionError } from "./session.js";

/**
 * Tự động xác định baseURL thông minh:
 * - Khi mở trên điện thoại (qua IP Wi-Fi 192.168.x hoặc tunnel), luôn dùng `/api`
 *   để proxy qua Vite dev server thay vì gọi localhost:5000 của chiếc điện thoại.
 */
function getBaseURL() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl === "/api") return "/api";

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocalhost && envUrl.includes("localhost:5000")) {
      return "/api";
    }
  }

  return envUrl;
}

// Refresh token chỉ nằm trong cookie httpOnly do backend đặt.
// Dọn refresh token cũ còn sót trong localStorage từ phiên bản trước.
try {
  localStorage.removeItem("chatai_refresh_token");
} catch {
  // localStorage không khả dụng (chế độ riêng tư, v.v.)
}

const api = axios.create({
  baseURL: getBaseURL().replace(/\/+$/, ""),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatai_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const NO_TOKEN_MESSAGE = "Không nhận được access token mới";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function clearStoredSession() {
  localStorage.removeItem("chatai_token");
  localStorage.removeItem("chatai_refresh_token");
  localStorage.removeItem("chatai_user");
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;
    const errorCode = err.response?.data?.error?.code;

    // Chỉ làm mới token khi backend báo đúng mã TOKEN_EXPIRED.
    // (Không dò theo nội dung thông báo vì CHALLENGE_EXPIRED, SESSION_REVOKED... cũng chứa "hết hạn".)
    const isTokenExpired = status === 401 && errorCode === "TOKEN_EXPIRED";

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      // Đừng lặp vô tận nếu chính endpoint refresh hoặc logout bị 401
      if (originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/logout")) {
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token được trình duyệt tự gửi qua cookie httpOnly (withCredentials).
        const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });

        const newAccessToken = res.data?.data?.token;
        if (!newAccessToken) throw new Error(NO_TOKEN_MESSAGE);

        localStorage.setItem("chatai_token", newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        const refreshStatus = refreshErr.response?.status;
        // Chỉ đăng xuất khi phiên thật sự không còn hợp lệ; lỗi mạng tạm thời thì giữ nguyên phiên.
        if (refreshStatus === 401 || refreshStatus === 403 || refreshErr.message === NO_TOKEN_MESSAGE) {
          clearStoredSession();
          handleSessionError(401, "SESSION_REVOKED");
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    handleSessionError(status, errorCode);
    return Promise.reject(err);
  }
);

export default api;