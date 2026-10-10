import { test, expect } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const user = { id: "1", username: "Reviewer", email: "reviewer@example.test", role: "user", avatar: "" };
const conversation = { _id: "7", title: "Review chat", provider: "groq", model: "test-model", updatedAt: new Date().toISOString(), pinned: false };
const richAnswer = "# Heading\n\nFirst paragraph.\n\nSecond paragraph.\n\n- Apple\n- Banana\n\n| Name | Value |\n| --- | --- |\n| Total | 42 |\n\n```js\nconst answer = 42;\n```\n\nFormula: $x^2$.";
const sse = (...events) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

async function setup(page, { corruptCache = false, meStatus = 200, vision = false, extraConversation = false } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = {
    messages: [{ _id: "1", role: "user", content: "Original question" }, { _id: "2", role: "assistant", content: richAnswer, provider: "groq" }],
    sends: [], editMode: "sse", sendFailures: 0, regenerates: 0, regenerateGate: null, crlf: false,
  };
  await page.addInitScript(({ user, corruptCache }) => {
    localStorage.setItem("chatai_token", "synthetic-review-token");
    localStorage.setItem("chatai_user", corruptCache ? "{broken-json" : JSON.stringify(user));
    localStorage.setItem("chatai_lang", "en");
    localStorage.setItem("chatai_theme", "light");
  }, { user, corruptCache });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname.replace(/^.*\/api/, "");
    let data = {};
    if (pathname === "/auth/me") {
      if (meStatus !== 200) return route.fulfill({ status: meStatus, json: { success: false, error: { code: "INTERNAL_ERROR", message: "Temporary error" } } });
      data = { user };
    } else if (pathname === "/preferences") data = { uiLanguage: "en", aiLanguage: "auto" };
    else if (pathname === "/models") data = { models: [{ _id: "1", provider: "groq", modelId: "test-model", displayName: "Review Model", capabilities: vision ? ["text", "vision"] : ["text"], available: true, isDefault: true }, { _id: "2", provider: "groq", modelId: "text-model", displayName: "Text Model", capabilities: ["text"], available: true }] };
    else if (pathname === "/usage") data = { models: [], totals: { totalTokens: 0 }, window: {} };
    else if (pathname === "/conversations") data = request.method() === "POST" ? { conversation } : { conversations: [conversation, ...(extraConversation ? [{ ...conversation, _id: "8", title: "Other chat" }] : [])] };
    else if (pathname === "/conversations/7/messages") data = { conversation, messages: state.messages };
    else if (pathname === "/conversations/8/messages") data = { conversation: { ...conversation, _id: "8" }, messages: [{ _id: "40", role: "user", content: "Other question" }, { _id: "50", role: "assistant", content: "Other answer" }] };
    else if (pathname === "/chat/7/stream") {
      const payload = request.postDataJSON();
      state.sends.push(payload);
      if (state.sendFailures-- > 0) return route.abort("failed");
      let body = sse({ started: true, userMessageId: "3" }, { token: "New answer" }, { done: true, messageId: "4", userMessageId: "3", provider: "groq" });
      if (state.crlf) body = body.replace(/\n/g, "\r\n");
      return route.fulfill({ contentType: "text/event-stream", body });
    } else if (pathname === "/chat/7/regenerate") {
      state.regenerates++;
      if (state.regenerateGate) await state.regenerateGate;
      state.messages = [{ _id: "1", role: "user", content: "Original question" }, { _id: "900", role: "assistant", content: "Regenerated answer" }];
      return route.fulfill({ contentType: "text/event-stream", body: sse({ started: true }, { token: "Regenerated answer" }, { done: true, messageId: "900", provider: "groq", replacedMessageId: "899", replacedAfterId: 1 }) });
    } else if (pathname === "/chat/7/edit/1") {
      state.messages = [{ _id: "1", role: "user", content: request.postDataJSON().content }];
      if (state.editMode === "network") return route.abort("failed");
      return route.fulfill({ contentType: "text/event-stream", body: sse({ started: true, userMessageId: "1" }, { error: "Provider offline", code: "PROVIDER_UNAVAILABLE", userMessageId: "1" }) });
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Review chat", exact: true }).click();
  await expect(page.locator(".markdown-body")).toBeVisible();
  return { state, errors };
}

test("copy keeps paragraphs, lists, tables, code and one math representation", async ({ page }) => {
  const { errors } = await setup(page);
  await page.locator(".markdown-body").hover();
  await page.getByRole("button", { name: "Copy answer", exact: true }).click();
  const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  expect(copied).toContain("First paragraph.\n\nSecond paragraph.");
  expect(copied).toContain("• Apple\n• Banana");
  expect(copied).toContain("Name\tValue\nTotal\t42");
  expect(copied).toContain("const answer = 42;");
  expect(copied).toContain("Formula: x^2.");
  expect(copied).not.toContain("Copy");
  expect(errors).toEqual([]);
});

test("IME confirmation does not send, and normal Enter sends once", async ({ page }) => {
  const { state, errors } = await setup(page);
  const input = page.locator("#chat-input-textarea");
  await input.fill("日本語");
  await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, keyCode: 229 });
  expect(state.sends).toHaveLength(0);
  await expect(input).toHaveValue("日本語");
  await input.press("Enter");
  await expect(page.getByText("New answer", { exact: true })).toBeVisible();
  expect(state.sends).toHaveLength(1);
  expect(state.sends[0].requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(errors).toEqual([]);
});

test("retry preserves the request ID after a lost acknowledgement", async ({ page }) => {
  const { state } = await setup(page);
  state.sendFailures = 1;
  await page.locator("#chat-input-textarea").fill("Retry question");
  await page.locator("#chat-input-textarea").press("Enter");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("New answer", { exact: true })).toBeVisible();
  expect(state.sends).toHaveLength(2);
  expect(state.sends[0].requestId).toBe(state.sends[1].requestId);
  await expect(page.getByText("Retry question", { exact: true })).toHaveCount(1);
});

for (const mode of ["sse", "network"]) {
  test(`a committed edit remains visible after a ${mode} failure`, async ({ page }) => {
    const { state, errors } = await setup(page);
    state.editMode = mode;
    await page.getByText("Original question", { exact: true }).hover();
    await page.getByRole("button", { name: "Edit message", exact: true }).click();
    await page.getByRole("textbox", { name: "Edit message", exact: true }).fill("Committed edit");
    await page.getByRole("button", { name: "Save and send", exact: true }).click();
    await expect(page.getByText("Committed edit", { exact: true })).toBeVisible();
    await expect(page.getByText("Original question", { exact: true })).toHaveCount(0);
    await expect(page.locator(".markdown-body")).toHaveCount(0);
    if (mode === "network") await expect(page.getByRole("button", { name: "Edit message", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("invalid cached JSON recovers through the authenticated profile request", async ({ page }) => {
  const { errors } = await setup(page, { corruptCache: true });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("chatai_user")).id)).toBe("1");
  expect(errors).toEqual([]);
});

test("a temporary profile error preserves the cached session", async ({ page }) => {
  const { errors } = await setup(page, { meStatus: 503 });
  expect(await page.evaluate(() => localStorage.getItem("chatai_token"))).toBe("synthetic-review-token");
  expect(errors).toEqual([]);
});

test("desktop/mobile layout and light/dark theme survive the CSS upgrade", async ({ page }, testInfo) => {
  const { errors } = await setup(page);
  await page.locator("#chat-input-textarea").fill("Ready");
  const send = page.getByRole("button", { name: "Send message", exact: true });
  expect(await send.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(send).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page.getByRole("button", { name: /dark/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
});

test("all UI languages have matching keys and interpolation placeholders", async () => {
  const locales = path.resolve("src/i18n/locales");
  const dictionaries = {};
  for (const lang of await readdir(locales)) {
    const dictionary = dictionaries[lang] = {};
    for (const file of await readdir(path.join(locales, lang))) {
      const entries = (await import(pathToFileURL(path.join(locales, lang, file)).href)).default;
      for (const [key, value] of Object.entries(entries)) {
        expect(dictionary[key], `Duplicate key: ${lang}/${key}`).toBeUndefined();
        dictionary[key] = value;
      }
    }
  }
  const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [lang, dictionary] of Object.entries(dictionaries)) {
    expect(Object.keys(dictionary).sort(), lang).toEqual(Object.keys(dictionaries.en).sort());
    for (const [key, value] of Object.entries(dictionary)) expect(placeholders(value), `${lang}/${key}`).toEqual(placeholders(dictionaries.en[key]));
  }
});


test("SSE responses with Windows line endings complete normally", async ({ page }) => {
  const { state } = await setup(page);
  state.crlf = true;
  await page.locator("#chat-input-textarea").fill("CRLF response");
  await page.locator("#chat-input-textarea").press("Enter");
  await expect(page.getByText("New answer", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop generating", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
});

test("finishing a reply cannot remove messages from a different conversation", async ({ page }) => {
  const { state, errors } = await setup(page, { extraConversation: true });
  let release;
  state.regenerateGate = new Promise(resolve => { release = resolve; });
  await page.getByRole("button", { name: "Regenerate answer", exact: true }).click();
  await expect.poll(() => state.regenerates).toBe(1);
  await page.getByRole("button", { name: "Other chat", exact: true }).click();
  await expect(page.getByText("Other answer", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("button", { name: "Stop generating", exact: true })).toHaveCount(0);
  await expect(page.getByText("Other answer", { exact: true })).toBeVisible();
  await expect(page.getByText("Regenerated answer", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("returning to a streaming conversation reloads its completed answer", async ({ page }) => {
  const { state } = await setup(page, { extraConversation: true });
  let release;
  state.regenerateGate = new Promise(resolve => { release = resolve; });
  await page.getByRole("button", { name: "Regenerate answer", exact: true }).click();
  await expect.poll(() => state.regenerates).toBe(1);
  await page.getByRole("button", { name: "Other chat", exact: true }).click();
  await expect(page.getByText("Other answer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review chat", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Heading", exact: true })).toBeVisible();
  release();
  await expect(page.getByText("Regenerated answer", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heading", exact: true })).toHaveCount(0);
});

const png = { name: "image.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64") };

test("pending file reads block sending and rapid additions stay within four images", async ({ page }) => {
  await page.addInitScript(() => {
    const read = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function(file) { setTimeout(() => read.call(this, file), 1000); };
  });
  const { state, errors } = await setup(page, { vision: true });
  const input = page.locator("#chat-input-textarea");
  await input.fill("Describe these images");
  await page.locator('input[type="file"]').setInputFiles([png, { ...png, name: "second.png" }, { ...png, name: "third.png" }]);
  await page.locator('input[type="file"]').setInputFiles([png, { ...png, name: "fifth.png" }]);
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
  await input.press("Enter");
  expect(state.sends).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Remove attached image", exact: true })).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled();
  await input.press("Enter");
  await expect(page.getByText("New answer", { exact: true })).toBeVisible();
  expect(state.sends[0].images).toHaveLength(4);
  expect(errors).toEqual([]);
});

test("switching to a text model clears image attachments", async ({ page }) => {
  const { state } = await setup(page, { vision: true });
  await page.locator('input[type="file"]').setInputFiles(png);
  await expect(page.getByRole("button", { name: "Remove attached image", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Choose AI model", exact: true }).click();
  await page.getByText("Text Model", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove attached image", exact: true })).toHaveCount(0);
  await page.locator("#chat-input-textarea").fill("Text only");
  await page.locator("#chat-input-textarea").press("Enter");
  await expect(page.getByText("New answer", { exact: true })).toBeVisible();
  expect(state.sends[0].images).toEqual([]);
});
