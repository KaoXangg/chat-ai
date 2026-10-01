import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./base.js";

function buildParts(message) {
  const parts = [];
  const images = message.images?.length ? message.images : message.image ? [message.image] : [];
  for (const img of images) {
    if (img?.data && img?.mimeType) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
  }
  parts.push({ text: message.content || "Mô tả (những) hình ảnh này." });
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

  async *streamChat(messages, model = "gemini-2.5-flash") {
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
    const chat = gModel.startChat({ history });

    const result = await chat.sendMessageStream(buildParts(lastMessage));

    for await (const chunk of result.stream) {
      const token = chunk.text();
      if (token) yield token;
    }
  }

  async generateTitle(text) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GEMINI_API_KEY.");
    const gModel = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await gModel.generateContent(
      `Tóm tắt câu hỏi sau thành một tiêu đề ngắn gọn bằng tiếng Việt, tối đa 6 từ, không dùng dấu ngoặc kép, không giải thích, chỉ trả về tiêu đề duy nhất:\n\n${text}`
    );
    return result.response.text()?.trim().replace(/^["']|["']$/g, "") || null;
  }
}