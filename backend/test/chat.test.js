import assert from "node:assert/strict";
import { before, after, beforeEach, test, mock } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Op, ValidationError, ValidationErrorItem, UniqueConstraintError } from "sequelize";

// Synthetic settings only. Tests never load .env, contact a provider or connect to SQL Server.
process.env.JWT_SECRET = "chat-regression-test-secret";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.CHAT_RATE_LIMIT_PER_MINUTE = "100";
const { sequelize, User, Conversation, Message, AIModel, TokenUsage } = await import("../models/index.js");
const { GroqProvider } = await import("../providers/groqProvider.js");
const { GeminiProvider } = await import("../providers/geminiProvider.js");
const { OpenRouterProvider } = await import("../providers/openrouterProvider.js");
const providerMethods = [GroqProvider, OpenRouterProvider, GeminiProvider].map((Provider) => ({
  Provider, streamChat: Provider.prototype.streamChat, isConfigured: Provider.prototype.isConfigured,
}));
function restoreMocks() {
  mock.restoreAll();
  // A test may replace a previously mocked method; restore the actual baseline.
  for (const { Provider, streamChat, isConfigured } of providerMethods) {
    Object.assign(Provider.prototype, { streamChat, isConfigured });
  }
}
const { streamWithFallback } = await import("../providers/aiRouter.js");
const { errorHandler } = await import("../middleware/errorHandler.js");
const chatRouter = (await import("../routes/chat.js")).default;
const conversationRouter = (await import("../routes/conversations.js")).default;

let server, base, rows, usage, operations, failDelete, history;
const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const model = { provider: "groq", modelId: "test-model", enabled: true, capabilities: ["text"], contextLength: 8192 };
const conversation = { id: 7, provider: "groq", model: "test-model", title: "Existing chat", save: async () => {} };
const request = (path, options = {}) => fetch(`${base}${path}`, { headers, ...options });
const regenerate = (options = {}) => request("/chat/7/regenerate", { method: "POST", body: "{}", ...options });
const events = (text) => text.split("\n\n").filter((line) => line.startsWith("data:")).map((line) => JSON.parse(line.slice(5)));
async function waitFor(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await delay(10);
  }
  assert.fail("Expected server action did not finish");
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/chat", chatRouter);
  app.use("/conversations", conversationRouter);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  restoreMocks();
});
beforeEach(() => {
  restoreMocks();
  rows = [
    Message.build({ id: 1, conversationId: 7, role: "user", content: "Question" }),
    Message.build({ id: 2, conversationId: 7, role: "assistant", content: "Original answer" }),
  ];
  usage = [];
  operations = [];
  failDelete = false;
  history = null;
  mock.method(User, "findByPk", async () => ({ id: 1, _id: "1", aiLanguage: "auto", status: "active" }));
  mock.method(Conversation, "findOne", async ({ where }) => String(where.id) === "7" && where.userId === 1 ? conversation : null);
  mock.method(AIModel, "findAll", async () => [{ toJSON: () => model }]);
  mock.method(TokenUsage, "create", async (entry) => { usage.push(entry); });
  mock.method(Message, "findOne", async ({ where }) => where.id ? rows.find((row) => String(row.id) === String(where.id)) : rows.filter((row) => !where.role || row.role === where.role).at(-1));
  mock.method(Message, "findAll", async (options) => {
    let found = rows.filter((row) => !options.where.id || row.id <= options.where.id[Op.lte]);
    if (options.order[0][1] === "DESC") found = found.toReversed();
    if (options.attributes) {
      assert.deepEqual(options.attributes.exclude, ["imageBase64", "images"]);
      return found.map((row) => ({ toJSON: () => {
        const value = row.toJSON();
        value.imageCount = row.images?.length || (row.imageBase64 ? 1 : 0);
        delete value.imageBase64;
        delete value.images;
        return value;
      } }));
    }
    history = found;
    return found;
  });
  mock.method(Message, "create", async (values, options) => {
    const row = Message.build({ ...values, id: Math.max(...rows.map((r) => r.id)) + 1 });
    operations.push({ action: "create", transaction: options?.transaction });
    rows.push(row);
    return row;
  });
  mock.method(Message, "destroy", async (options) => {
    operations.push({ action: "delete", transaction: options.transaction });
    if (failDelete) throw new Error("Simulated delete failure");
    rows = rows.filter((row) => !(row.role === options.where.role && row.id > options.where.id[Op.gt] && row.id <= options.where.id[Op.lte]));
    return 1;
  });
  mock.method(sequelize, "transaction", async (callback) => {
    const snapshot = [...rows];
    try { return await callback({ testTransaction: true }); }
    catch (error) { rows = snapshot; throw error; }
  });
  mock.method(GroqProvider.prototype, "isConfigured", () => true);
  mock.method(GeminiProvider.prototype, "isConfigured", () => false);
  mock.method(OpenRouterProvider.prototype, "isConfigured", () => false);
  mock.method(GroqProvider.prototype, "streamChat", async function* () { yield "Replacement"; });
});

test("regenerate preserves the original when all providers fail", async () => {
  mock.method(GroqProvider.prototype, "streamChat", async function* () { throw new Error("Provider offline"); });
  const result = events(await (await regenerate()).text());
  assert.ok(result.some((entry) => entry.error));
  assert.equal(rows.at(-1).content, "Original answer");
  assert.equal(operations.length, 0);
  assert.equal(usage.length, 0);
  assert.deepEqual(history.map((row) => row.id), [1]);
});

test("successful regenerate creates before deleting in the same transaction", async () => {
  const result = events(await (await regenerate()).text());
  assert.equal(result.at(-1).done, true);
  assert.equal(result.at(-1).replacedMessageId, "2");
  assert.deepEqual(rows.map((row) => row.content), ["Question", "Replacement"]);
  assert.deepEqual(operations.map((entry) => entry.action), ["create", "delete"]);
  assert.ok(operations[0].transaction);
  assert.equal(operations[0].transaction, operations[1].transaction);
  assert.equal(usage.length, 1);
});

test("replacement transaction failure retains the original and bills once", async () => {
  failDelete = true;
  const result = events(await (await regenerate()).text());
  assert.ok(result.at(-1).error);
  assert.ok(rows.some((row) => row.id === 2 && row.content === "Original answer"));
  assert.equal(rows.filter((row) => row.content === "Replacement").length, 1);
  assert.equal(usage.length, 1);
});

test("mid-stream provider failure saves interrupted text without deleting the original", async () => {
  mock.method(GroqProvider.prototype, "streamChat", async function* () {
    yield "Partial";
    throw new Error("Provider timeout");
  });
  const result = events(await (await regenerate()).text());
  assert.ok(rows.some((row) => row.id === 2));
  assert.equal(rows.at(-1).content, "Partial");
  assert.equal(rows.at(-1).interrupted, true);
  assert.equal(rows.at(-1).isError, true);
  assert.equal(result.at(-1).messageId, rows.at(-1)._id);
  assert.equal(usage.length, 1);
  assert.equal(usage[0].completionTokens, Math.ceil("Partial".length / 3));
});

test("regenerating after interruption uses the last question and replaces both old answers only on success", async () => {
  rows.push(Message.build({ id: 3, conversationId: 7, role: "assistant", content: "Interrupted retry", interrupted: true }));
  const result = events(await (await regenerate()).text());
  assert.equal(result.at(-1).replacedMessageId, "3");
  assert.equal(result.at(-1).replacedAfterId, 1);
  assert.deepEqual(history.map((row) => row.content), ["Question"]);
  assert.deepEqual(rows.map((row) => row.content), ["Question", "Replacement"]);
});

for (const partial of [false, true]) {
  test(`response disconnect aborts the provider ${partial ? "after text" : "before the first token"}`, async () => {
    let providerSignal;
    mock.method(GroqProvider.prototype, "streamChat", async function* (_messages, _model, { signal }) {
      providerSignal = signal;
      if (partial) yield "Partial";
      await new Promise((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener("abort", resolve, { once: true });
      });
      // Model an SDK that ends silently on abort.
    });
    const controller = new AbortController();
    const response = await regenerate({ signal: controller.signal });
    const reader = response.body.getReader();
    let body = "";
    while (partial && !body.includes('"token":"Partial"')) body += new TextDecoder().decode((await reader.read()).value);
    await waitFor(() => providerSignal);
    // Receiving the complete POST body must not trigger cancellation.
    assert.equal(providerSignal.aborted, false);
    controller.abort();
    await reader.cancel().catch(() => {});
    await waitFor(() => providerSignal.aborted);
    await waitFor(() => partial ? rows.length === 3 && usage.length === 1 : rows.length === 2);
    assert.ok(rows.some((row) => row.id === 2));
    if (partial) {
      assert.equal(rows.at(-1).interrupted, true);
      assert.equal(rows.at(-1).isError, false);
      assert.equal(usage[0].completionTokens, Math.ceil("Partial".length / 3));
    } else assert.equal(usage.length, 0);
  });
}

test("abort never starts a fallback provider", async () => {
  const controller = new AbortController();
  let fallbackCalls = 0;
  mock.method(GeminiProvider.prototype, "isConfigured", () => true);
  mock.method(GroqProvider.prototype, "streamChat", async function* () {
    controller.abort();
    controller.signal.throwIfAborted();
  });
  mock.method(GeminiProvider.prototype, "streamChat", async function* () { fallbackCalls++; yield "wrong"; });
  await assert.rejects(async () => {
    for await (const _item of streamWithFallback([{ role: "user", content: "Question" }], "groq", "test-model", { signal: controller.signal })) {}
  }, { name: "AbortError" });
  assert.equal(fallbackCalls, 0);
});

for (const Provider of [GroqProvider, OpenRouterProvider, GeminiProvider]) {
  test(`${Provider.name} passes cancellation through its installed SDK to fetch`, async () => {
    // Restore the real adapter implementation, then replace only the transport.
    restoreMocks();
    let requestSignal;
    mock.method(globalThis, "fetch", async (_url, options) => {
      requestSignal = options.signal;
      return await new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException("Test transport aborted", "AbortError"));
        if (requestSignal.aborted) abort();
        else requestSignal.addEventListener("abort", abort, { once: true });
      });
    });
    const provider = new Provider();
    provider.apiKey = "synthetic-test-key";
    provider.client = Provider === GroqProvider ? new Groq({ apiKey: provider.apiKey, fetch: globalThis.fetch })
      : Provider === OpenRouterProvider ? new OpenAI({ apiKey: provider.apiKey, fetch: globalThis.fetch })
      : new GoogleGenerativeAI(provider.apiKey);
    const controller = new AbortController();
    const pending = (async () => {
      for await (const _chunk of provider.streamChat([{ role: "user", content: "Question" }], undefined, { signal: controller.signal })) {}
    })();
    const rejected = assert.rejects(pending);
    await waitFor(() => requestSignal);
    assert.equal(requestSignal.aborted, false);
    controller.abort();
    await rejected;
    assert.equal(requestSignal.aborted, true);
  });
}

test("real Sequelize validation and uniqueness errors return 400 without logging values", () => {
  const log = mock.method(console, "error", () => {});
  const item = new ValidationErrorItem("private value", "validation error", "email", "private@example.test");
  for (const error of [new ValidationError("invalid", [item]), new UniqueConstraintError({ errors: [item] })]) {
    let status, body;
    const response = { status(code) { status = code; return this; }, json(value) { body = value; } };
    errorHandler(error, {}, response, () => {});
    assert.equal(status, 400);
    assert.deepEqual(body.error.fields, ["email"]);
    assert.ok(!JSON.stringify(body).includes("private"));
  }
  assert.equal(log.mock.calls.length, 0);
});

test("message list returns image URLs and separate image endpoint returns bytes", async () => {
  rows[0].images = [{ mimeType: "image/png", data: Buffer.from("first-image").toString("base64") }, { mimeType: "image/jpeg", data: Buffer.from("second-image").toString("base64") }];
  rows[0].imageBase64 = rows[0].images[0].data;
  const response = await request("/conversations/7/messages");
  const body = await response.json();
  const message = body.data.messages[0];
  assert.equal(message.images.length, 2);
  assert.equal(message.imageBase64, undefined);
  assert.ok(!JSON.stringify(body).includes(rows[0].images[0].data));
  const image = await request(message.images[1].url);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.equal(image.headers.get("cache-control"), "private, no-store");
  assert.equal(await image.text(), "second-image");
});

test("legacy single-image attachments remain accessible", async () => {
  rows[0].imageBase64 = Buffer.from("legacy-image").toString("base64");
  rows[0].imageMimeType = "image/png";
  const body = await (await request("/conversations/7/messages")).json();
  assert.equal(body.data.messages[0].images.length, 1);
  const image = await request(body.data.messages[0].images[0].url);
  assert.equal(await image.text(), "legacy-image");
});

test("image access requires authentication, ownership and a valid index", async () => {
  assert.equal((await fetch(`${base}/conversations/7/messages/1/images/0`)).status, 401);
  assert.equal((await request("/conversations/8/messages/1/images/0")).status, 404);
  assert.equal((await request("/conversations/7/messages/1/images/-1")).status, 400);
  assert.equal((await request("/conversations/7/messages/1/images/4")).status, 400);
});
