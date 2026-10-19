import { ValidationError } from "../utils/AppError.js";

/**
 * Validate incoming request { body, query, params } using Zod schemas
 * Assigns sanitized and coerced parsed data back to req.body/query/params.
 */
export function validate(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        const cleanedQuery = { ...req.query };
        for (const [key, value] of Object.entries(cleanedQuery)) {
          if (value === "") {
            delete cleanedQuery[key];
          }
        }
        req.query = await schemas.query.parseAsync(cleanedQuery);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      if (err.name === "ZodError" && Array.isArray(err.issues)) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          message: issue.message,
        }));
        return next(new ValidationError("Dữ liệu yêu cầu không hợp lệ.", details));
      }
      next(err);
    }
  };
}
