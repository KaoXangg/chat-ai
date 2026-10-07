import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, TITLE_SYSTEM_PROMPT } from "./base.js";

function buildParts(message) {
  const parts = [];
  const images = message.images?.length ? message.images : message.image ? [message.image] : [];
  for (const img of images) {
    if (img?.data && img?.mimeType) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
  }
  parts.push({ text: message.content || "Describe the image(s)." });
  return parts;
}

export class GeminiProvider extends AIProvider {
  constructor() {
    super("gemini");
    this.apiKey = process.env.GEMINI_API_KEY;
    this.client = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async *streamChat(messages, model = "gemini-2.5-flash", { signal } = {}) {
    signal?.throwIfAborted();
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GEMINI_API_KEY.");

    const systemMsg = messages.find((m) => m.role === "system");
    const gModel = this.client.getGenerativeModel({
      model,
      systemInstruction: systemMsg?.content,
    });

    const history = messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: buildParts(m),
      }));

    const lastMessage = messages[messages.length - 1];
    const result = await gModel.generateContentStream({
      contents: [...history, { role: "user", parts: buildParts(lastMessage) }],
    }, { signal });
    // The response promise can reject independently when the fetch is aborted.
    result.response.catch(() => {});

    for await (const chunk of result.stream) {
      const token = chunk.text();
      if (token) yield token;
    }

    // Số token thật: totalTokenCount đã gồm cả token "suy nghĩ" của Gemini 2.5.
    try {
      const meta = (await result.response).usageMetadata;
      if (meta) {
        const promptTokens = meta.promptTokenCount || 0;
        yield { usage: { promptTokens, completionTokens: Math.max(0, (meta.totalTokenCount || 0) - promptTokens) } };
      }
    } catch {
      /* không lấy được usage -> router sẽ tự ước lượng */
    }
  }

  async generateTitle(text, { signal } = {}) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GEMINI_API_KEY.");
    const gModel = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await gModel.generateContent(`${TITLE_SYSTEM_PROMPT}\n\nMessage:\n${text}`, { signal });
    return result.response.text()?.trim().replace(/^["']|["']$/g, "") || null;
  }
}
