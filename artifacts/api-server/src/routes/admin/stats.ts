import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  conversationsTable,
  messagesTable,
  creditLedgerTable,
  paymentOrdersTable,
} from "@workspace/db";
import { eq, count, sum, gte } from "drizzle-orm";

const router = Router();

// GET /api/admin/stats
router.get("/", async (req, res) => {
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);
  const [{ totalConversations }] = await db.select({ totalConversations: count() }).from(conversationsTable);
  const [{ totalMessages }] = await db.select({ totalMessages: count() }).from(messagesTable);
  const [{ pendingOrders }] = await db.select({ pendingOrders: count() }).from(paymentOrdersTable).where(eq(paymentOrdersTable.status, "PENDING"));
  const [{ totalRevenue }] = await db.select({ totalRevenue: sum(paymentOrdersTable.amount) }).from(paymentOrdersTable).where(eq(paymentOrdersTable.status, "PAID"));

  const creditStats = await db.select({ type: creditLedgerTable.type, amount: creditLedgerTable.amount }).from(creditLedgerTable);
  const totalCreditsIssued = creditStats.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0);
  const totalCreditsUsed = creditStats.filter((c) => c.amount < 0 && c.type === "AI_USAGE").reduce((s, c) => s + Math.abs(c.amount), 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [{ activeUsers }] = await db.select({ activeUsers: count() }).from(conversationsTable).where(gte(conversationsTable.updatedAt, thirtyDaysAgo));

  res.json({
    totalUsers,
    totalConversations,
    totalMessages,
    totalCreditsIssued,
    totalCreditsUsed,
    pendingOrders,
    totalRevenue: totalRevenue ?? 0,
    activeUsers,
  });
});

export default router;
