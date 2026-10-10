import axios from "axios";
import { handleSessionError } from "./session.js";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, ""),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatai_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err.response?.data?.error?.code;
    handleSessionError(err.response?.status, code);
    return Promise.reject(err);
  }
);

export default api;
