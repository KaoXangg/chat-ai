export function invalidInput(message = "Dữ liệu không hợp lệ.") {
  return Object.assign(new Error(message), { status: 400, code: "INVALID_INPUT" });
}

export function isSqlId(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;
}

export function validateIdParam(req, res, next, value) {
  if (!isSqlId(value)) return next(invalidInput("Mã định danh không hợp lệ."));
  next();
}

export function requireObjectBody(req, res, next) {
  if (req.body !== undefined && (req.body === null || typeof req.body !== "object" || Array.isArray(req.body))) {
    return next(invalidInput("Nội dung yêu cầu phải là một JSON object."));
  }
  next();
}
