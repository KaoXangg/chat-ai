import OpenAI from "openai";
import { AIProvider, TITLE_SYSTEM_PROMPT, toOpenAIMessages } from "./base.js";

const RETIRED_FREE_MODELS = new Set([
  "meta-llama/llama-3.1-8b-instruct:free",
  "deepseek/deepseek-chat:free",
]);

export class OpenRouterProvider extends AIProvider {
  constructor() {
    super("openrouter");
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.client = this.apiKey
      ? new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: this.apiKey,
          defaultHeaders: {
            "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
            "X-Title": "Chat AI",
          },
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async *streamChat(messages, model = "openrouter/free", { signal } = {}) {
    signal?.throwIfAborted();
    if (!this.isConfigured()) throw new Error("Chưa cấu hình OPENROUTER_API_KEY.");

    const selectedModel = RETIRED_FREE_MODELS.has(model) ? "openrouter/free" : model;

    const stream = await this.client.chat.completions.create({
      model: selectedModel,
      messages: toOpenAIMessages(messages),
      stream: true,
    }, { signal });

    let usage = null;
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) yield token;
      if (chunk.usage) usage = chunk.usage; // chunk cuối (choices có thể rỗng)
    }
    if (usage) yield { usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens } };
  }

  async generateTitle(text, { signal } = {}) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình OPENROUTER_API_KEY.");
    const completion = await this.client.chat.completions.create({
      model: "openrouter/free",
      messages: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    }, { signal });
    return completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || null;
  }
}
