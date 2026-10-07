export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async *streamChat(messages, model, { signal } = {}) {
    throw new Error(`Nhà cung cấp "${this.name}" chưa triển khai streamChat().`);
  }

  async generateTitle(text) {
    throw new Error(`Nhà cung cấp "${this.name}" chưa triển khai generateTitle().`);
  }

  isConfigured() {
    return true;
  }
}

/** Prompt tạo tiêu đề: giữ nguyên ngôn ngữ của câu hỏi (không ép tiếng Việt). */
export const TITLE_SYSTEM_PROMPT =
  "Summarize the user's message into a short title of at most 6 words, written in the SAME language as the message. Do not use quotation marks, do not explain, return only the title.";

/**
 * Chuyển tin nhắn nội bộ sang định dạng OpenAI-compatible (dùng cho Groq / OpenRouter).
 * Tin nhắn có ảnh -> content dạng mảng [{type:"text"}, {type:"image_url"}] để model vision đọc được.
 */
export function toOpenAIMessages(messages) {
  return messages.map((m) => {
    const images = m.images?.length ? m.images : m.image ? [m.image] : [];
    const valid = images.filter((img) => img?.data && img?.mimeType);
    if (m.role !== "user" || !valid.length) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        { type: "text", text: m.content || "Describe the image(s)." },
        ...valid.map((img) => ({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data}` } })),
      ],
    };
  });
}
