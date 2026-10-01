import Groq from "groq-sdk";
import { AIProvider, TITLE_SYSTEM_PROMPT, toOpenAIMessages } from "./base.js";

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
      messages: toOpenAIMessages(messages),
      stream: true,
      temperature: 0.7,
    });

    let usage = null;
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) yield token;
      // Groq trả số token ở chunk cuối (x_groq.usage).
      const u = chunk.x_groq?.usage || chunk.usage;
      if (u) usage = u;
    }
    if (usage) yield { usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens } };
  }

  async generateTitle(text) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình GROQ_API_KEY.");
    const completion = await this.client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });
    return completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || null;
  }
}