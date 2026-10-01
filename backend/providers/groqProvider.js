import Groq from "groq-sdk";
import { AIProvider } from "./base.js";

export class GroqProvider extends AIProvider {
  constructor() {
    super("groq");
    this.apiKey = process.env.GROQ_API_KEY;
    this.client = this.apiKey ? new Groq({ apiKey: this.apiKey }) : null;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async *streamChat(messages, model = "openai/gpt-oss-20b") {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GROQ_API_KEY.");

    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) yield token;
    }
  }

  async generateTitle(text) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GROQ_API_KEY.");
    const completion = await this.client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "Tóm tắt câu hỏi sau thành một tiêu đề ngắn gọn bằng tiếng Việt, tối đa 6 từ, không dùng dấu ngoặc kép, không giải thích, chỉ trả về tiêu đề." },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });
    return completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || null;
  }
}