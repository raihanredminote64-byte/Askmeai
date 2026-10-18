import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  creditLedgerTable,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import { eq, ilike, or, count, sql, desc } from "drizzle-orm";
import { createAuditLog } from "../../lib/audit.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

// GET /api/admin/users
router.get("/", async (req: AuthRequest, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
  const offset = parseInt(String(req.query.offset || "0"), 10);

  const baseQuery = db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      credits: usersTable.credits,
      isEnabled: usersTable.isEnabled,
      createdAt: usersTable.createdAt,
      conversationCount: sql<number>`(SELECT COUNT(*) FROM conversations WHERE user_id = ${usersTable.id})`.as("conversation_count"),
      messageCount: sql<number>`(SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ${usersTable.id})`.as("message_count"),
    })
    .from(usersTable);

  const items = search
    ? await baseQuery
        .where(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.name, `%${search}%`)))
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset)
    : await baseQuery.orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(usersTable);

  res.json({
    items: items.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    total,
  });
});

// GET /api/admin/users/:id
router.get("/:id", async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id))).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [convCount] = await db.select({ total: count() }).from(conversationsTable).where(eq(conversationsTable.userId, user.id));
  const [msgCount] = await db
    .select({ total: count() })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(eq(conversationsTable.userId, user.id));

  const ledgerStats = await db
    .select({ type: creditLedgerTable.type, amount: creditLedgerTable.amount })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, user.id));

  const totalReceived = ledgerStats.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const totalSpent = ledgerStats.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);

  const recentLedger = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, user.id))
    .orderBy(desc(creditLedgerTable.createdAt))
    .limit(10);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    credits: user.credits,
    isEnabled: user.isEnabled,
    createdAt: user.createdAt.toISOString(),
    conversationCount: convCount.total,
    messageCount: msgCount.total,
    totalCreditsReceived: totalReceived,
    totalCreditsSpent: totalSpent,
    recentLedger: recentLedger.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
  });
});

// POST /api/admin/users/:id/credits
router.post("/:id/credits", async (req: AuthRequest, res) => {
  const schema = z.object({
    action: z.enum(["add", "remove", "set", "reset"]),
    amount: z.number().optional(),
    reason: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id))).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { action, amount, reason } = parsed.data;
  const balanceBefore = user.credits;
  let balanceAfter = balanceBefore;
  let ledgerAmount = 0;
  let ledgerType = "ADMIN_ADD";

  if (action === "add") {
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount required for add action" });
      return;
    }
    balanceAfter = balanceBefore + amount;
    ledgerAmount = amount;
    ledgerType = "ADMIN_ADD";
  } else if (action === "remove") {
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount required for remove action" });
      return;
    }
    balanceAfter = Math.max(0, balanceBefore - amount);
    ledgerAmount = -(balanceBefore - balanceAfter);
    ledgerType = "ADMIN_REMOVE";
  } else if (action === "set") {
    if (amount === undefined || amount < 0) {
      res.status(400).json({ error: "Amount required for set action" });
      return;
    }
    balanceAfter = amount;
    ledgerAmount = balanceAfter - balanceBefore;
    ledgerType = "ADMIN_SET";
  } else if (action === "reset") {
    balanceAfter = 0;
    ledgerAmount = -balanceBefore;
    ledgerType = "ADMIN_RESET";
  }

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ credits: balanceAfter }).where(eq(usersTable.id, user.id));
    if (ledgerAmount !== 0) {
      await tx.insert(creditLedgerTable).values({
        userId: user.id,
        amount: ledgerAmount,
        balanceBefore,
        balanceAfter,
        type: ledgerType,
        description: reason,
        adminId: req.user!.userId,
      });
    }
  });

  await createAuditLog("ADJUST_CREDITS", "users", {
    userId: req.user!.userId,
    resourceId: user.id,
    details: { action, amount, balanceBefore, balanceAfter, reason },
  });

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  res.json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    credits: updatedUser.credits,
    isEnabled: updatedUser.isEnabled,
    createdAt: updatedUser.createdAt.toISOString(),
    conversationCount: 0,
    messageCount: 0,
  });
});

// POST /api/admin/users/:id/toggle
router.post("/:id/toggle", async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id))).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isEnabled: !user.isEnabled })
    .where(eq(usersTable.id, user.id))
    .returning();

  await createAuditLog(updated.isEnabled ? "ENABLE_USER" : "DISABLE_USER", "users", {
    userId: req.user!.userId,
    resourceId: user.id,
  });

  res.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    credits: updated.credits,
    isEnabled: updated.isEnabled,
    createdAt: updated.createdAt.toISOString(),
    conversationCount: 0,
    messageCount: 0,
  });
});

export default router;
