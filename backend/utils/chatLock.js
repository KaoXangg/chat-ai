import { QueryTypes } from "sequelize";
import { chatLockDatabase } from "../config/db.js";

/** Database application locks work across backend processes and release on rollback/disconnect. */
export async function withDatabaseLocks(resources, task) {
  return chatLockDatabase.transaction(async (transaction) => {
    for (const resource of [...new Set(resources)].sort()) {
      const rows = await chatLockDatabase.query(`
        DECLARE @result INT;
        EXEC @result = sys.sp_getapplock @Resource = :resource,
          @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
        SELECT @result AS lockResult;
      `, { replacements: { resource }, type: QueryTypes.SELECT, transaction });
      if (rows[0]?.lockResult < 0) {
        const error = new Error("Đang có một lượt chat hoặc thao tác khác. Vui lòng đợi rồi thử lại.");
        error.status = 409;
        error.code = "CHAT_BUSY";
        throw error;
      }
      if (!Number.isInteger(rows[0]?.lockResult)) throw new Error("Không thể xác nhận khóa hội thoại.");
    }
    return task();
  });
}

export const conversationLock = (id) => `chat:conversation:${Number(id)}`;
export const userChatLock = (id) => `chat:user:${Number(id)}`;

export function serializeDatabaseMutation(resourcesForRequest, handler) {
  return async (req, res, next) => {
    try { await withDatabaseLocks(resourcesForRequest(req), () => handler(req, res, next)); }
    catch (error) { next(error); }
  };
}

export function serializeChat(handler) {
  return async (req, res, next) => {
    const id = Number(req.params.conversationId);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Hội thoại không hợp lệ." } });
    }
    try {
      // The user lock also prevents parallel requests from racing the daily quota ledger.
      await withDatabaseLocks([userChatLock(req.user.id), conversationLock(id)], () => handler(req, res, next));
    } catch (err) {
      if (err.code === "CHAT_BUSY" && !res.headersSent) {
        return res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
      }
      next(err);
    }
  };
}

/** Apply the same lock to renaming, model changes and deletion while a reply is running. */
export function serializeConversationMutation(handler) {
  return async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Hội thoại không hợp lệ." } });
    }
    try {
      await withDatabaseLocks([conversationLock(id)], () => handler(req, res, next));
    } catch (err) {
      next(err);
    }
  };
}
