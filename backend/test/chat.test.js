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
const { chatLockDatabase } = await import("../config/db.js");
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
const { streamWithFallback, buildAttempts } = await import("../providers/aiRouter.js");
const { errorHandler } = await import("../middleware/errorHandler.js");
const chatRouter = (await import("../routes/chat.js")).default;
const conversationRouter = (await import("../routes/conversations.js")).default;
const adminRouter = (await import("../routes/admin.js")).default;
const { requireObjectBody } = await import("../utils/validation.js");

let server, base, rows, usage, operations, failDelete, history;
let locks;
const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const model = { provider: "groq", modelId: "test-model", enabled: true, capabilities: ["text"], contextLength: 8192 };
const conversation = { id: 7, provider: "groq", model: "test-model", title: "Existing chat", save: async () => {}, setDataValue(key, value) { this[key] = value; }, changed() {} };
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
  app.use(requireObjectBody);
  app.use("/chat", chatRouter);
  app.use("/conversations", conversationRouter);
  app.use("/admin", adminRouter);
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
  locks = new Map();
  mock.method(User, "findByPk", async () => ({ id: 1, _id: "1", role: "user", tokenVersion: 0, aiLanguage: "auto", status: "active" }));
  mock.method(Conversation, "findOne", async ({ where }) => String(where.id) === "7" && where.userId === 1 ? conversation : null);
  mock.method(AIModel, "findAll", async () => [{ toJSON: () => model }]);
  mock.method(TokenUsage, "create", async (entry, options) => { usage.push({ ...entry, transaction: options?.transaction }); });
  mock.method(Message, "findOne", async ({ where, order }) => {
    let found = rows.filter((row) => (!where.role || row.role === where.role)
      && (!where.requestId || row.requestId === where.requestId)
      && (!where.id || (typeof where.id === "object"
        ? (where.id[Op.gt] === undefined || row.id > where.id[Op.gt]) && (where.id[Op.lt] === undefined || row.id < where.id[Op.lt])
        : String(row.id) === String(where.id))));
    return order?.[0]?.[1] === "ASC" ? found[0] : found.at(-1);
  });
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
    rows = rows.filter((row) => !((!options.where.role || row.role === options.where.role) && row.id > options.where.id[Op.gt] && (options.where.id[Op.lte] === undefined || row.id <= options.where.id[Op.lte])));
    return 1;
  });
  mock.method(sequelize, "transaction", async (callback) => {
    const snapshot = [...rows];
    const transaction = { testTransaction: true };
    try { return await callback(transaction); }
    catch (error) { rows = snapshot; throw error; }
  });
  mock.method(chatLockDatabase, "transaction", async (callback) => {
    const transaction = { resources: [] };
    try { return await callback(transaction); }
    finally { for (const resource of transaction.resources) if (locks.get(resource) === transaction) locks.delete(resource); }
  });
  mock.method(chatLockDatabase, "query", async (sql, { replacements, transaction }) => {
    assert.ok(sql.includes("sp_getapplock"), "Unexpected database query in isolated tests");
    const resource = replacements.resource;
    if (locks.has(resource) && locks.get(resource) !== transaction) return [{ lockResult: -1 }];
    locks.set(resource, transaction);
    transaction.resources.push(resource);
    return [{ lockResult: 0 }];
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

test("an empty enabled catalog never activates legacy providers", () => {
  assert.equal(buildAttempts({ preferredProvider: "groq", catalog: [] }).attempts.length, 0);
  assert.ok(buildAttempts({ preferredProvider: "groq" }).attempts.length > 0);
});

test("images retained in conversation history require a vision model", async () => {
  let textCalls = 0, visionMessages;
  mock.method(GeminiProvider.prototype, "isConfigured", () => true);
  mock.method(GroqProvider.prototype, "streamChat", async function* () { textCalls++; yield "wrong"; });
  mock.method(GeminiProvider.prototype, "streamChat", async function* (messages) { visionMessages = messages; yield "vision answer"; });
  for await (const _chunk of streamWithFallback([
    { role: "user", content: "Image", images: [{ mimeType: "image/png", data: "AA==" }] },
    { role: "assistant", content: "Description" }, { role: "user", content: "Follow-up" },
  ], "groq", model.modelId, { catalog: [model, { ...model, provider: "gemini", modelId: "vision-model", capabilities: ["vision"] }] })) {}
  assert.equal(textCalls, 0);
  assert.ok(visionMessages[0].images.length);
});

test("history failures after a send acknowledge the saved question via SSE", async () => {
  mock.method(Message, "findAll", async () => { throw new Error("Synthetic history failure"); });
  const response = await request("/chat/7/stream", { method: "POST", body: JSON.stringify({ content: "New question", requestId: "review-send-1" }) });
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  const result = events(await response.text());
  const question = rows.find((row) => row.requestId === "review-send-1");
  assert.equal(result[0].userMessageId, question._id);
  assert.ok(result.at(-1).error);
  assert.equal(result.at(-1).userMessageId, question._id);
});

test("history failures after an edit keep the committed edit and report its ID", async () => {
  mock.method(Message, "findAll", async () => { throw new Error("Synthetic history failure"); });
  rows[0].save = async () => {};
  const response = await request("/chat/7/edit/1", { method: "POST", body: JSON.stringify({ content: "Edited question" }) });
  const result = events(await response.text());
  assert.equal(rows[0].content, "Edited question");
  assert.equal(rows.length, 1);
  assert.equal(result[0].userMessageId, "1");
  assert.ok(result.at(-1).error);
});

test("retrying the same send replays its answer without duplicate messages or billing", async () => {
  const send = () => request("/chat/7/stream", { method: "POST", body: JSON.stringify({ content: "New question", requestId: "same-request" }) });
  assert.ok(events(await (await send()).text()).at(-1).done);
  const count = rows.length;
  const billCount = usage.length;
  const replay = events(await (await send()).text());
  assert.equal(rows.length, count);
  assert.equal(usage.length, billCount);
  assert.equal(replay.find((event) => event.token).token, "Replacement");
  assert.ok(replay.at(-1).done);
});

test("parallel chat, edit and model changes are rejected until the active request finishes", async () => {
  let providerStarted, releaseProvider;
  const started = new Promise((resolve) => { providerStarted = resolve; });
  const release = new Promise((resolve) => { releaseProvider = resolve; });
  mock.method(GroqProvider.prototype, "streamChat", async function* () { providerStarted(); await release; yield "Answer"; });
  const pending = request("/chat/7/stream", { method: "POST", body: JSON.stringify({ content: "First", requestId: "concurrent-first" }) });
  await started;
  try {
    for (const [path, method, body] of [["/chat/7/stream", "POST", { content: "Second" }], ["/chat/7/edit/1", "POST", { content: "Changed" }], ["/conversations/7", "PATCH", { model: "another" }]]) {
      const response = await request(path, { method, body: JSON.stringify(body) });
      assert.equal(response.status, 409);
      assert.equal((await response.json()).error.code, "CHAT_BUSY");
    }
  } finally { releaseProvider(); }
  assert.ok(events(await (await pending).text()).at(-1).done);
  assert.equal(rows.filter((row) => row.role === "user" && row.content === "Second").length, 0);
  assert.equal(locks.size, 0);
});

test("new messages explicitly touch an unchanged conversation timestamp", async () => {
  const oldTime = new Date("2020-01-01T00:00:00Z");
  const real = Conversation.build({ id: 7, userId: 1, title: "Existing chat", provider: "groq", model: "test-model", updatedAt: oldTime }, { isNewRecord: false, raw: true });
  const savedChanges = [];
  real.save = async () => { savedChanges.push(real.changed("updatedAt")); };
  mock.method(Conversation, "findOne", async () => real);
  const response = await request("/chat/7/stream", { method: "POST", body: JSON.stringify({ content: "New question" }) });
  assert.ok(events(await response.text()).at(-1).done);
  assert.ok(real.updatedAt > oldTime);
  assert.ok(savedChanges.every(Boolean));
});


test("successful answers and their usage ledger share a transaction", async () => {
  const result = events(await (await regenerate()).text());
  assert.ok(result.at(-1).done);
  assert.ok(usage[0].transaction);
  assert.equal(usage[0].transaction, operations[0].transaction);
});

test("a quota ledger write failure cannot report an unbilled successful replacement", async () => {
  mock.method(TokenUsage, "create", async () => { throw new Error("Synthetic quota write failure"); });
  const result = events(await (await regenerate()).text());
  assert.ok(result.at(-1).error);
  assert.equal(result.some(event => event.done), false);
  assert.ok(rows.some(row => row.content === "Original answer" && !row.interrupted));
  assert.ok(rows.some(row => row.content === "Replacement" && row.interrupted));
});

test("invalid IDs, conversation fields and malformed JSON are rejected before mutations", async () => {
  for (const path of ["/conversations/999999999999999/messages", "/conversations/not-an-id/messages", "/chat/-1/regenerate"]) {
    assert.equal((await request(path, { method: path.startsWith("/chat") ? "POST" : "GET" })).status, 400);
  }
  for (const body of [{ title: {} }, { pinned: "false" }, { model: [] }, { provider: "unknown" }]) {
    assert.equal((await request("/conversations/7", { method: "PATCH", body: JSON.stringify(body) })).status, 400);
  }
  assert.equal((await request("/conversations", { method: "POST", body: "[]" })).status, 400);
  const malformed = await request("/conversations", { method: "POST", body: "{bad-json" });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_INPUT");
  assert.equal(operations.length, 0);
});

test("failed conversation deletion rolls back message deletion", async () => {
  mock.method(Message, "destroy", async ({ transaction }) => { assert.ok(transaction); rows = []; });
  conversation.destroy = async ({ transaction }) => { assert.ok(transaction); throw new Error("Synthetic conversation deletion failure"); };
  const response = await request("/conversations/7", { method: "DELETE" });
  assert.equal(response.status, 500);
  assert.equal(rows.length, 2);
  delete conversation.destroy;
});

test("failed admin user deletion rolls back all related deletions", async () => {
  let deleted = false;
  const target = { id: 2, destroy: async () => { deleted = true; } };
  mock.method(User, "findByPk", async id => Number(id) === 1 ? { id: 1, role: "admin" } : target);
  mock.method(Conversation, "findAll", async () => [{ id: 7 }]);
  mock.method(Message, "destroy", async ({ transaction }) => { assert.ok(transaction); rows = []; });
  mock.method(Conversation, "destroy", async ({ transaction }) => { assert.ok(transaction); throw new Error("Synthetic user deletion failure"); });
  assert.equal((await request("/admin/users/2", { method: "DELETE" })).status, 500);
  assert.equal(deleted, false);
  assert.equal(rows.length, 2);
});

test("banning and unbanning a user does not reactivate their old token", async () => {
  const target = User.build({ id: 2, username: "Target", email: "target@example.test", passwordHash: "synthetic-hash", status: "active", tokenVersion: 0 });
  target.save = async () => {};
  mock.method(User, "findByPk", async id => Number(id) === 1 ? { id: 1, role: "admin" } : target);
  for (const status of ["banned", "active"]) assert.equal((await request("/admin/users/2", { method: "PATCH", body: JSON.stringify({ status }) })).status, 200);
  const response = await request("/chat/7/regenerate", { method: "POST", body: "{}", headers: { ...headers, Authorization: "Bearer " + jwt.sign({ id: 2, tokenVersion: 0 }, process.env.JWT_SECRET) } });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "SESSION_REVOKED");
});

test("concurrent default model creation is serialized across requests", async () => {
  mock.method(User, "findByPk", async () => ({ id: 1, role: "admin" }));
  let started, release;
  const waiting = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  const models = [];
  mock.method(AIModel, "update", async () => { for (const model of models) model.isDefault = false; return [models.length]; });
  mock.method(AIModel, "create", async payload => { started(); await waiting; models.push(payload); return payload; });
  const payload = { provider: "groq", modelId: "first", displayName: "First", isDefault: true };
  const pending = request("/admin/models", { method: "POST", body: JSON.stringify(payload) });
  await entered;
  try {
    const conflicting = await request("/admin/models", { method: "POST", body: JSON.stringify({ ...payload, modelId: "second" }) });
    assert.equal(conflicting.status, 409);
    assert.equal((await conflicting.json()).error.code, "CHAT_BUSY");
  } finally { release(); }
  assert.equal((await pending).status, 201);
  assert.equal(models.filter(model => model.isDefault).length, 1);
});
