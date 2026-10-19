import "dotenv/config";
import jwt from "jsonwebtoken";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import TokenUsage from "../models/TokenUsage.js";
import AIModel from "../models/AIModel.js";

const PORT = Number(process.env.PORT) || 5000;
const BASE_URL = process.env.TEST_BASE_URL || `http://127.0.0.1:${PORT}`;

async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`[Setup] Đã kết nối đến server đang chạy tại ${BASE_URL}`);
      return;
    }
  } catch (err) {
    console.error(`[Setup] Không thể kết nối đến server tại ${BASE_URL}: ${err.message}. Script yêu cầu server đang hoạt động.`);
    process.exit(1);
  }

  console.error(`[Setup] Server tại ${BASE_URL} trả về trạng thái không sẵn sàng.`);
  process.exit(1);
}

function parseSSEEvents(rawText) {
  return rawText
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.startsWith("data:"))
    .map((block) => {
      try {
        return JSON.parse(block.replace(/^data:\s*/, ""));
      } catch {
        return { raw: block };
      }
    });
}

async function readStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(chunk);
  }

  return fullText;
}

async function run() {
  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`\n========================================================`);
  console.log(`  KIỂM THỬ HỆ THỐNG QUOTA & CONCURRENCY (QUOTA-E2E.JS) `);
  console.log(`  Run ID: ${testRunId}`);
  console.log(`========================================================\n`);

  await ensureServer();

  // Find an enabled model
  const activeModel = await AIModel.findOne({ where: { enabled: true }, order: [["priority", "ASC"]] });
  const modelProvider = activeModel ? activeModel.provider : "groq";
  const modelId = activeModel ? activeModel.modelId : "llama-3.3-70b-versatile";
  console.log(`[Setup] Sử dụng AI Model: ${modelProvider}/${modelId}`);

  const createdUserIds = [];
  const createdConversationIds = [];

  async function createTestContext(prefix, { tier = "free", customDailyTokenLimit = null } = {}) {
    const email = `test-quota-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
    const user = await User.create({
      username: `u_${prefix.slice(0, 10)}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      passwordHash: "synthetic_test_hash",
      role: "user",
      status: "active",
      userTier: tier,
      customDailyTokenLimit,
      aiLanguage: "auto",
    });
    createdUserIds.push(user.id);

    const conversation = await Conversation.create({
      userId: user.id,
      title: `Test Quota ${prefix}`,
      provider: modelProvider,
      model: modelId,
    });
    createdConversationIds.push(conversation.id);

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "fallback_secret");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    return { user, conversation, token, headers };
  }

  const results = [];

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: User quota thấp -> Chat -> Hết quota nhận 429 QUOTA_EXCEEDED
    // -------------------------------------------------------------
    {
      console.log("[1/6] Đang chạy Scenario 1: Kiểm tra 429 QUOTA_EXCEEDED...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { user, conversation, headers } = await createTestContext("sc1", {
          customDailyTokenLimit: 20,
        });

        // Insert usage so used (25) > limit (20)
        await TokenUsage.create({
          userId: user.id,
          provider: modelProvider,
          modelId,
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
          estimated: false,
        });

        // Request should now be blocked by checkQuota before calling provider
        const res = await fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Hello AI!" }),
        });

        const status = res.status;
        const retryAfter = res.headers.get("retry-after");
        const quotaRemaining = res.headers.get("x-quota-remaining");
        const body = await res.json().catch(() => ({}));

        if (
          status === 429 &&
          body?.error?.code === "QUOTA_EXCEEDED" &&
          retryAfter !== null &&
          quotaRemaining === "0" &&
          body?.error?.details?.remaining === 0
        ) {
          passed = true;
          notes = `Status: 429, Code: ${body.error.code}, Retry-After: ${retryAfter}s, Remaining: ${quotaRemaining}`;
        } else {
          notes = `Mismatch: Status=${status}, Code=${body?.error?.code}, Details=${JSON.stringify(body?.error?.details)}`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 1: Hết quota nhận 429 QUOTA_EXCEEDED kèm headers và details", passed, duration, notes });
    }

    // -------------------------------------------------------------
    // SCENARIO 2: 5 parallel requests -> Chỉ tối đa 1 xử lý, các req còn lại nhận 409 CHAT_BUSY
    // -------------------------------------------------------------
    {
      console.log("[2/6] Đang chạy Scenario 2: Kiểm tra 5 request song song (concurrency lock)...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { conversation, headers } = await createTestContext("sc2", {
          customDailyTokenLimit: 1_000_000,
        });

        // Send 5 parallel requests with abort controllers
        const controllers = Array.from({ length: 5 }, () => new AbortController());
        const promises = Array.from({ length: 5 }, (_, i) =>
          fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
            method: "POST",
            headers,
            body: JSON.stringify({ content: `Parallel ping ${i + 1}` }),
            signal: controllers[i].signal,
          })
        );

        const responses = await Promise.all(promises);
        const statuses = responses.map((r) => r.status);
        const busyResponses = responses.filter((r) => r.status === 409);
        const okResponses = responses.filter((r) => r.status === 200);

        // Abort all in-flight streams immediately so provider does not burn rate limits
        for (let i = 0; i < 5; i++) {
          controllers[i].abort();
          if (responses[i].body) {
            try {
              responses[i].body.getReader().cancel().catch(() => {});
            } catch {}
          }
        }

        // Wait brief delay for lock to clear
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (busyResponses.length >= 4 && okResponses.length <= 1) {
          passed = true;
          notes = `Statuses: [${statuses.join(", ")}]. ${busyResponses.length} rejected with 409 CHAT_BUSY, ${okResponses.length} acquired lock.`;
        } else {
          notes = `Unexpected statuses: [${statuses.join(", ")}]. Expected at least four 409 responses.`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 2: 5 request song song bị concurrency lock chặn (409 CHAT_BUSY)", passed, duration, notes });
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Client abort mid-flight -> Ghi nhận token đã sinh & giải phóng lock
    // -------------------------------------------------------------
    {
      console.log("[3/6] Đang chạy Scenario 3: Kiểm tra abort mid-flight và giải phóng lock...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { user, conversation, headers } = await createTestContext("sc3", {
          customDailyTokenLimit: 1_000_000,
        });

        const controller = new AbortController();
        const fetchPromise = fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Xin chào, hãy trả lời 1 từ." }),
          signal: controller.signal,
        });

        try {
          const res = await fetchPromise;
          if (res.status === 200 && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              if (text.includes('"token"')) {
                // We received actual generated tokens! Abort mid-stream now.
                controller.abort();
                await reader.cancel().catch(() => {});
                break;
              }
            }
          }
        } catch (abortErr) {
          // Expected AbortError
        }

        // Wait 1000ms for backend cleanup & TokenUsage save
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test that lock was cleaned up by sending another quick request
        const checkLockController = new AbortController();
        const checkLockRes = await fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Ping lock check" }),
          signal: checkLockController.signal,
        });

        // It should NOT be 409 CHAT_BUSY!
        const isLockClean = checkLockRes.status !== 409;
        checkLockController.abort();
        if (checkLockRes.body) {
          checkLockRes.body.getReader().cancel().catch(() => {});
        }

        // Verify TokenUsage has records for this user
        const usageCount = await TokenUsage.count({ where: { userId: user.id } });

        if (isLockClean && usageCount > 0) {
          passed = true;
          notes = `Lock sạch (status: ${checkLockRes.status} != 409), đã ghi nhận ${usageCount} lượt token usage.`;
        } else {
          notes = `Lock status: ${checkLockRes.status}, TokenUsage rows: ${usageCount}`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 3: Client disconnect mid-stream giải phóng lock và ghi nhận usage", passed, duration, notes });
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Gọi regenerate và edit khi hết quota -> Đều bị chặn 429
    // -------------------------------------------------------------
    {
      console.log("[4/6] Đang chạy Scenario 4: Kiểm tra regenerate & edit khi hết quota...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { user, conversation, headers } = await createTestContext("sc4", {
          customDailyTokenLimit: 10,
        });

        // Setup a message in conversation for edit
        const msg = await Message.create({
          conversationId: conversation.id,
          role: "user",
          content: "Tin nhắn trước đó",
        });

        // Force quota exhaustion
        await TokenUsage.create({
          userId: user.id,
          provider: modelProvider,
          modelId,
          promptTokens: 20,
          completionTokens: 20,
          totalTokens: 40,
        });

        // 1. Test regenerate
        const regenRes = await fetch(`${BASE_URL}/api/chat/${conversation.id}/regenerate`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });
        const regenBody = await regenRes.json().catch(() => ({}));

        // 2. Test edit
        const editRes = await fetch(`${BASE_URL}/api/chat/${conversation.id}/edit/${msg.id}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Tin nhắn sửa mới" }),
        });
        const editBody = await editRes.json().catch(() => ({}));

        const regenBlocked = regenRes.status === 429 && regenBody?.error?.code === "QUOTA_EXCEEDED";
        const editBlocked = editRes.status === 429 && editBody?.error?.code === "QUOTA_EXCEEDED";

        if (regenBlocked && editBlocked) {
          passed = true;
          notes = `regenerate: 429 (${regenBody.error.code}), edit: 429 (${editBody.error.code})`;
        } else {
          notes = `regen=${regenRes.status} (${regenBody?.error?.code}), edit=${editRes.status} (${editBody?.error?.code})`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 4: Chặn regenerate và edit khi hết quota (429 QUOTA_EXCEEDED)", passed, duration, notes });
    }

    // -------------------------------------------------------------
    // SCENARIO 5: Nâng tier qua POST /api/usage/upgrade -> Chat lại được ngay lập tức
    // -------------------------------------------------------------
    {
      console.log("[5/6] Đang chạy Scenario 5: Kiểm tra nâng tier mở khóa ngay lập tức...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { user, conversation, headers } = await createTestContext("sc5", {
          tier: "free",
          customDailyTokenLimit: null,
        });

        // User currently exhausted on free tier (limit 50,000, used 60,000)
        await TokenUsage.create({
          userId: user.id,
          provider: modelProvider,
          modelId,
          promptTokens: 30000,
          completionTokens: 30000,
          totalTokens: 60000,
        });

        // Verify user is blocked right now
        const blockedRes = await fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Before upgrade" }),
        });
        const wasBlocked = blockedRes.status === 429;

        // Upgrade tier to plus (limit 250,000 > 60,000)
        const upgradeRes = await fetch(`${BASE_URL}/api/usage/upgrade`, {
          method: "POST",
          headers,
          body: JSON.stringify({ tier: "plus" }),
        });
        const upgradeData = await upgradeRes.json().catch(() => ({}));

        // Try chatting again immediately
        const unblockedRes = await fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Hello after upgrade!" }),
        });

        const isUnblocked = unblockedRes.status === 200;
        if (unblockedRes.body) {
          const reader = unblockedRes.body.getReader();
          reader.cancel().catch(() => {});
        }

        if (wasBlocked && upgradeRes.status === 200 && isUnblocked) {
          passed = true;
          notes = `Ban đầu 429 -> Nâng Plus thành công (tier: ${upgradeData?.data?.tier}) -> Chat ngay lập tức 200 OK`;
        } else {
          notes = `wasBlocked=${wasBlocked}, upgradeStatus=${upgradeRes.status}, unblockedStatus=${unblockedRes.status}`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 5: Nâng tier mở khóa quota lập tức không cần chờ qua ngày", passed, duration, notes });
    }

    // -------------------------------------------------------------
    // SCENARIO 6: User còn quota -> Chat bình thường, stream token đầy đủ
    // -------------------------------------------------------------
    {
      console.log("[6/6] Đang chạy Scenario 6: Kiểm tra stream tin nhắn bình thường...");
      const start = Date.now();
      let passed = false;
      let notes = "";

      try {
        const { conversation, headers } = await createTestContext("sc6", {
          tier: "plus",
          customDailyTokenLimit: null,
        });

        const res = await fetch(`${BASE_URL}/api/chat/${conversation.id}/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "Trả lời ngắn gọn: 2+2 bằng mấy?" }),
        });

        const status = res.status;
        const contentType = res.headers.get("content-type") || "";
        const isSSE = contentType.includes("text/event-stream");

        let fullSSEText = "";
        if (status === 200 && isSSE) {
          fullSSEText = await readStream(res);
          const parsedEvents = parseSSEEvents(fullSSEText);
          const hasDone = parsedEvents.some((ev) => ev.done || ev.type === "done");
          const hasContent = parsedEvents.some((ev) => ev.token || ev.content);

          if (hasContent || hasDone) {
            passed = true;
            notes = `Status: 200 OK, Content-Type: ${contentType}, Nhận được ${parsedEvents.length} SSE events`;
          } else {
            notes = `Stream ended without content or done events. Raw: ${fullSSEText.slice(0, 100)}`;
          }
        } else {
          const errBody = await res.text().catch(() => "");
          notes = `Status=${status}, ContentType=${contentType}, Body=${errBody.slice(0, 150)}`;
        }
      } catch (err) {
        notes = `Error: ${err.message}`;
      }

      const duration = Date.now() - start;
      results.push({ name: "Scenario 6: User còn quota stream tin nhắn AI đầy đủ thành công", passed, duration, notes });
    }
  } finally {
    // -------------------------------------------------------------
    // Dọn dẹp dữ liệu test (Clean up)
    // -------------------------------------------------------------
    console.log("[Cleanup] Đang dọn dẹp dữ liệu kiểm thử...");
    try {
      if (createdUserIds.length) {
        await TokenUsage.destroy({ where: { userId: createdUserIds } });
      }
      if (createdConversationIds.length) {
        await Message.destroy({ where: { conversationId: createdConversationIds } });
        await Conversation.destroy({ where: { id: createdConversationIds } });
      }
      if (createdUserIds.length) {
        await User.destroy({ where: { id: createdUserIds } });
      }
      console.log(`[Cleanup] Đã dọn dẹp sạch sẽ ${createdUserIds.length} test users và các bản ghi liên quan.`);
    } catch (cleanErr) {
      console.error("[Cleanup] Lỗi dọn dẹp:", cleanErr.message);
    }

    try {
      await sequelize.close();
    } catch {}
  }

  // -------------------------------------------------------------
  // Tổng kết kết quả (Print Summary)
  // -------------------------------------------------------------
  console.log("\n========================================================");
  console.log("                    KẾT QUẢ KIỂM THỬ                   ");
  console.log("========================================================");

  let allPassed = true;
  for (const r of results) {
    const tag = r.passed ? "[\x1b[32mPASS\x1b[0m]" : "[\x1b[31mFAIL\x1b[0m]";
    console.log(`${tag} ${r.name} (${r.duration}ms)`);
    if (r.notes) {
      console.log(`       -> ${r.notes}`);
    }
    if (!r.passed) allPassed = false;
  }

  console.log("========================================================\n");

  if (allPassed) {
    console.log("\x1b[32mTất cả 6 kịch bản kiểm thử đã VƯỢT QUA thành công!\x1b[0m\n");
    process.exit(0);
  } else {
    console.error("\x1b[31mCó ít nhất một kịch bản kiểm thử KHÔNG ĐẠT.\x1b[0m\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Lỗi thực thi quota-e2e:", err);
  process.exit(1);
});
