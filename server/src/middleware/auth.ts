import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/auth.js";
import { fail } from "../lib/http.js";
import type { Role } from "../../generated/prisma/enums.js";

// Make the decoded token available as req.user across the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Rejects the request unless it carries a valid Bearer token.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, 401, "Authentication required");
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return fail(res, 401, "Invalid or expired session");
  }
}

// Guards a route to the given roles. Must run after requireAuth.
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return fail(res, 401, "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, "You do not have permission to do this");
    }
    next();
  };
}
