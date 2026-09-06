import { ROLES } from "@/constants/roles";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: ROLES;
      };
    }
  }
}

export {};