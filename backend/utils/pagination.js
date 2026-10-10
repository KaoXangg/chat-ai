export function parsePagination(query, defaultLimit = 20) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? defaultLimit);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset > 2147483647) {
    const error = new Error("page phải là số nguyên dương; limit phải từ 1 đến 100.");
    error.status = 400;
    error.code = "INVALID_INPUT";
    throw error;
  }
  return { page, limit, offset };
}
