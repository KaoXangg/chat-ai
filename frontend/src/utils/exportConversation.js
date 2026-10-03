function imageCount(message) {
  if (message.images?.length) return message.images.length;
  return message.imageBase64 ? 1 : 0;
}

/**
 * Chuyển cuộc trò chuyện sang Markdown. `labels` do nơi gọi truyền vào (đã dịch theo ngôn ngữ giao diện):
 * { exportedAt, you, ai, attachedImages } - exportedAt/attachedImages là hàm nhận tham số.
 */
export function conversationToMarkdown(title, messages, labels, locale = "en") {
  const lines = [`# ${title}`, "", `_${labels.exportedAt(new Date().toLocaleString(locale))}_`, ""];

  for (const m of messages) {
    const isUser = m.role === "user";
    const who = isUser ? `🧑 ${labels.you}` : `🤖 ${labels.ai}${m.provider ? ` (${m.provider})` : ""}`;
    lines.push("---", "", `## ${who}`, "");
    const n = imageCount(m);
    if (n > 0) lines.push(`_[${labels.attachedImages(n)}]_`, "");
    lines.push(m.content || "", "");
  }
  return lines.join("\n");
}

export function downloadTextFile(filename, text, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeFileName(name, fallback = "conversation") {
  const cleaned = String(name || "").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);
  return cleaned || fallback;
}