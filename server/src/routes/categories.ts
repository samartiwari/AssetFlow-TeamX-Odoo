import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Read-only list used to populate the category dropdown when registering an
// asset. Full category management (create/edit) lives with Org Setup.
router.get("/", requireAuth, async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return ok(res, { categories });
});

export default router;
