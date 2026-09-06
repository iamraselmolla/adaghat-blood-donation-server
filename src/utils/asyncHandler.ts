import { NextFunction, Request, Response } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route/middleware handler so any rejected promise is
 * forwarded to Express's error-handling middleware. `express-async-errors`
 * (imported once in app.ts) already does this globally, but wrapping
 * explicitly keeps controllers self-documenting and safe if that import
 * is ever removed.
 */
export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
