import type { Response } from "express";

// Standard response shapes. Success always wraps the payload in `data`,
// failures always carry an `error` message (plus any extra fields the
// caller wants to expose, e.g. the conflicting slot on a 409).
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function fail(
  res: Response,
  status: number,
  error: string,
  extra: Record<string, unknown> = {}
) {
  return res.status(status).json({ error, ...extra });
}
