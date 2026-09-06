import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { Role } from "../constants/roles";

/**
 * Restricts a route to the given roles. Must run after `protect`.
 * MEMBER accounts are enforced as strictly read-only by simply never
 * being included in the allowed-roles list for write routes.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
