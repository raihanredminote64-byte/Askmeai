import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, creditLedgerTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/credits/balance
router.get("/balance", async (req: AuthRequest, res) => {
  const [user] = await db
    .select({ credits: usersTable.credits })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ userId: req.user!.userId, credits: user.credits });
});

// GET /api/credits/history
router.get("/history", async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
  const offset = parseInt(String(req.query.offset || "0"), 10);

  const items = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, req.user!.userId))
    .orderBy(desc(creditLedgerTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, req.user!.userId));

  res.json({
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
  });
});

export default router;
