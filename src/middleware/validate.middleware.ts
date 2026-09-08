import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

import { ApiError } from "../utils/ApiError";

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.slice(1).join(".") || issue.path.join(".") || "value";
          if (!errors[key]) errors[key] = issue.message;
        }
        return next(ApiError.badRequest("Validation failed", errors));
      }
      next(err);
    }
  };
}
