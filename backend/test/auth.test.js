import assert from "node:assert/strict";
import { before, after, beforeEach, test, mock } from "node:test";
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "auth-regression-test-secret";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
const { sequelize, User, PasswordReset } = await import("../models/index.js");
const authRouter = (await import("../routes/auth.js")).default;
const { authMiddleware } = await import("../middleware/auth.js");
const { errorHandler } = await import("../middleware/errorHandler.js");
const { generateToken } = await import("../utils/generateToken.js");
let server, base, user, reset, failPasswordWrite;
const oldPassword = "original-password";
const hash = bcrypt.hashSync(oldPassword, 4);
const post = (path, body, token) => fetch(`${base}/auth/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
const privateRequest = (token) => fetch(`${base}/private`, { headers: { Authorization: `Bearer ${token}` } });

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.get("/private", authMiddleware, (_req, res) => res.json({ success: true }));
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); mock.restoreAll(); });
beforeEach(() => {
  mock.restoreAll();
  user = User.build({ id: 1, username: "Tester", email: "tester@example.test", passwordHash: hash, tokenVersion: 0, avatar: "test-avatar" });
  reset = { id: 1, userId: 1, attempts: 0, used: false, expiresAt: new Date(Date.now() + 60000), otpHash: crypto.createHash("sha256").update("123456").digest("hex") };
  failPasswordWrite = false;
  mock.method(console, "error", () => {});
  mock.method(sequelize, "query", async () => { throw new Error("Unexpected database query in isolated tests"); });
  mock.method(User, "findOne", async () => user);
  mock.method(User, "findByPk", async () => user);
  mock.method(User, "update", async ({ passwordHash }) => {
    if (failPasswordWrite) throw new Error("Synthetic write failure");
    user.passwordHash = passwordHash;
    user.tokenVersion += 1;
    return [1];
  });
  mock.method(PasswordReset, "findOne", async () => reset.used ? null : reset);
  mock.method(PasswordReset, "update", async (values, { where }) => {
    if (where.id && (reset.used || (values.attempts && reset.attempts >= 5))) return [0];
    if (values.attempts) reset.attempts += 1;
    if (values.used) reset.used = true;
    return [1];
  });
  mock.method(sequelize, "transaction", async (callback) => {
    const snapshot = { hash: user.passwordHash, version: user.tokenVersion, reset: { ...reset } };
    try { return await callback({ testTransaction: true }); }
    catch (error) { user.passwordHash = snapshot.hash; user.tokenVersion = snapshot.version; Object.assign(reset, snapshot.reset); throw error; }
  });
});

test("password reset revokes existing sessions and a new login works", async () => {
  const token = generateToken(user);
  assert.equal((await privateRequest(token)).status, 200);
  assert.equal((await post("reset-password", { email: user.email, otp: "123456", newPassword: "replacement-password" })).status, 200);
  const revoked = await privateRequest(token);
  assert.equal(revoked.status, 401);
  assert.equal((await revoked.json()).error.code, "SESSION_REVOKED");
  const login = await post("login", { email: user.email, password: "replacement-password" });
  assert.equal(login.status, 200);
  assert.equal((await privateRequest((await login.json()).data.token)).status, 200);
});

test("password change revokes existing sessions only after a correct password", async () => {
  const token = generateToken(user);
  const wrong = await post("change-password", { currentPassword: "incorrect", newPassword: "replacement-password" }, token);
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).error.code, "WRONG_PASSWORD");
  assert.equal((await privateRequest(token)).status, 200);
  assert.equal((await post("change-password", { currentPassword: oldPassword, newPassword: "replacement-password" }, token)).status, 200);
  assert.equal((await privateRequest(token)).status, 401);
});

test("database errors are server errors and do not invalidate JWTs", async () => {
  const token = generateToken(user);
  mock.method(User, "findByPk", async () => { throw new Error("Synthetic database timeout"); });
  const response = await privateRequest(token);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, "INTERNAL_ERROR");
});

test("legacy JWTs work until a password change revokes them", async () => {
  const token = jwt.sign({ id: "1" }, process.env.JWT_SECRET);
  assert.equal((await privateRequest(token)).status, 200);
  user.tokenVersion = 1;
  assert.equal((await privateRequest(token)).status, 401);
});

test("failed password persistence rolls back OTP consumption", async () => {
  failPasswordWrite = true;
  const response = await post("reset-password", { email: user.email, otp: "123456", newPassword: "replacement-password" });
  assert.equal(response.status, 500);
  assert.equal(reset.used, false);
  assert.equal(user.tokenVersion, 0);
  assert.equal(user.passwordHash, hash);
});

test("invalid OTPs stop after five attempts and cannot change a password", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await post("reset-password", { email: user.email, otp: "654321", newPassword: "replacement-password" })).status, 400);
  const locked = await post("reset-password", { email: user.email, otp: "123456", newPassword: "replacement-password" });
  assert.equal((await locked.json()).error.code, "OTP_LOCKED");
  assert.equal(user.passwordHash, hash);
});

test("malformed auth payloads are client errors", async () => {
  assert.equal((await post("login", { email: 123, password: [] })).status, 400);
  assert.equal((await post("register", { username: {}, email: [], password: 123 })).status, 400);
  assert.equal((await post("reset-password", { email: "x", otp: {}, newPassword: [] })).status, 400);
});


test("a password change cannot overwrite a concurrent credential change", async () => {
  const token = generateToken(user);
  mock.method(User, "update", async () => [0]);
  const response = await post("change-password", { currentPassword: oldPassword, newPassword: "replacement-password" }, token);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "SESSION_REVOKED");
  assert.equal(user.passwordHash, hash);
  assert.equal(reset.used, false);
});
