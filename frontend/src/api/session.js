/** Only authentication failures revoke the cached session. */
export function handleSessionError(status, code) {
  const invalid = status === 401 && ["NO_TOKEN", "INVALID_TOKEN", "SESSION_REVOKED", "USER_NOT_FOUND"].includes(code);
  if (!invalid && !(status === 403 && code === "USER_BANNED")) return;
  localStorage.removeItem("chatai_token");
  localStorage.removeItem("chatai_user");
  if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
}
