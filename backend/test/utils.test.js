import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { parsePagination } from "../utils/pagination.js";
const { sprintf, vsprintf } = createRequire(import.meta.url)("sprintf-js");

test("pagination accepts bounded integers and rejects dangerous offsets", () => {
  assert.deepEqual(parsePagination({ page: "2", limit: "15" }), { page: 2, limit: 15, offset: 15 });
  for (const query of [{ page: "-1" }, { page: "1.5" }, { limit: "0" }, { limit: "101" }, { page: "1e50" }, { page: "999999999", limit: "100" }, { page: ["1", "2"] }]) {
    assert.throws(() => parsePagination(query), { status: 400 });
  }
});

test("patched sprintf retains SQL driver formatting and named/positional arguments", () => {
  assert.equal(sprintf("TDS:0x%08X, PacketSize:0x%08X", 0x74000004, 4096), "TDS:0x74000004, PacketSize:0x00001000");
  assert.equal(vsprintf("%02X %d %s", [15, -7, "test"]), "0F -7 test");
  assert.equal(sprintf("%(value)s", { value: "named" }), "named");
  assert.equal(sprintf("%2$s %1$s", "first", "second"), "second first");
});

test("patched sprintf rejects resource exhaustion before formatting", () => {
  assert.throws(() => sprintf("%.999999999999999999f", 1), RangeError);
  assert.throws(() => sprintf("%999999999999999999s", "x"), RangeError);
  assert.throws(() => sprintf("x".repeat(65537)), RangeError);
  assert.equal(sprintf("%.2f", 1.234), "1.23");
});


test("model payload validates types, SQL integer ranges and excludes protected fields", async () => {
  const { sanitizeModelPayload } = await import("../utils/modelPayload.js");
  const valid = { provider: "groq", modelId: "test", displayName: "Test" };
  const payload = sanitizeModelPayload({ ...valid, id: 900, createdAt: "changed", dailyTokenLimit: 100, capabilities: ["text", "text"] }, { creating: true });
  assert.equal(payload.id, undefined);
  assert.equal(payload.createdAt, undefined);
  assert.equal(payload.dailyTokenLimit, 100);
  assert.deepEqual(payload.capabilities, ["text"]);
  for (const bad of [{ dailyTokenLimit: -1 }, { dailyTokenLimit: Infinity }, { dailyTokenLimit: "100" }, { dailyTokenLimit: 2147483648 }, { enabled: "false" }, { capabilities: "vision" }, { contextLength: 0 }, { modelId: {} }, { provider: "unknown" }]) {
    assert.throws(() => sanitizeModelPayload({ ...valid, ...bad }, { creating: true }), { status: 400 });
  }
});
