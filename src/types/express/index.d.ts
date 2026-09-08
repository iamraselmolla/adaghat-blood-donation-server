import { Role } from "../../models/User.model";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  tokenVersion: number;
  name: string;
  identifier: string;
  status: "ACTIVE" | "DISABLED";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
