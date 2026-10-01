function imageCount(message) {
  if (message.images?.length) return message.images.length;
  return message.imageBase64 ? 1 : 0;
}

export function conversationToMarkdown(title, messages) {
  const lines = [`# ${title}`, "", `_Xuất từ Chat AI lúc ${new Date().toLocaleString("vi-VN")}_`, ""];

  for (const m of messages) {
    const isUser = m.role === "user";
    const who = isUser ? "🧑 Bạn" : `🤖 AI${m.provider ? ` (${m.provider})` : ""}`;
    lines.push("---", "", `## ${who}`, "");
    const n = imageCount(m);
    if (n > 0) lines.push(`_[Đính kèm ${n} ảnh]_`, "");
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

export function safeFileName(name, fallback = "cuoc-tro-chuyen") {
  const cleaned = String(name || "").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);
  return cleaned || fallback;
}