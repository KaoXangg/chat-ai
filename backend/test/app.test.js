import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import { User } from "../models/index.js";

process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.JWT_SECRET = "app-parser-test-secret";
const { createApp } = await import("../app.js");
let server;
let base;

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  mock.restoreAll();
});

test("general routes reject a 1MB body with PAYLOAD_TOO_LARGE", async () => {
  const payload = JSON.stringify({ blob: "x".repeat(1024 * 1024) });
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, "PAYLOAD_TOO_LARGE");
});

test("chat routes accept a 1MB body through the larger parser", async () => {
  const payload = JSON.stringify({ content: "x".repeat(1024 * 1024) });
  const response = await fetch(`${base}/api/chat/7/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  assert.notEqual(response.status, 413);
  assert.ok(response.status >= 400);
});

test("small login bodies reach the login route", async () => {
  mock.method(User, "findOne", async () => null);
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "unknown@example.test", password: "wrong-password" }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "INVALID_CREDENTIALS");
});

test("TRUST_PROXY defaults off and accepts a positive hop count", () => {
  const previous = process.env.TRUST_PROXY;
  try {
    delete process.env.TRUST_PROXY;
    assert.equal(createApp().get("trust proxy"), false);
    process.env.TRUST_PROXY = "2";
    assert.equal(createApp().get("trust proxy"), 2);
    process.env.TRUST_PROXY = "invalid";
    assert.equal(createApp().get("trust proxy"), false);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
});
