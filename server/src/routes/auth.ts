import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  hashPassword,
  comparePassword,
  signToken,
  signupSchema,
  loginSchema,
} from "../lib/auth.js";
import { ok, fail } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Fields safe to return to the client. The password hash is never selected.
const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
} as const;

// New accounts always start as employees; roles are assigned later by an admin.
router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid signup details", {
      issues: parsed.error.issues,
    });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail(res, 409, "An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
    },
    select: publicUser,
  });

  const token = signToken({ sub: user.id, role: user.role });
  return ok(res, { token, user }, 201);
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "Invalid login details");
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return fail(res, 401, "Invalid email or password");
  }
  if (user.status !== "ACTIVE") {
    return fail(res, 403, "This account is inactive");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return ok(res, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: publicUser,
  });
  if (!user) {
    return fail(res, 404, "User not found");
  }
  return ok(res, { user });
});

export default router;
