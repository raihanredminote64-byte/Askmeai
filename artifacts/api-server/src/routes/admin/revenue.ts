import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentOrdersTable,
  aiUsageTable,
  creditLedgerTable,
} from "@workspace/db";
import { and, eq, count, sum, gte } from "drizzle-orm";

const router = Router();

// GET /api/admin/revenue
router.get("/", async (req, res) => {
  const period = typeof req.query.period === "string" ? req.query.period : "30d";

  let since: Date | undefined;
  if (period === "7d") since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  else if (period === "30d") since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  else if (period === "90d") since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [{ total: totalRevenue }] = since
    ? await db.select({ total: sum(paymentOrdersTable.amount) })
        .from(paymentOrdersTable)
        .where(and(eq(paymentOrdersTable.status, "PAID"), gte(paymentOrdersTable.approvedAt, since)))
    : await db.select({ total: sum(paymentOrdersTable.amount) })
        .from(paymentOrdersTable)
        .where(eq(paymentOrdersTable.status, "PAID"));
  const [{ total: creditsSold }] = since
    ? await db.select({ total: sum(paymentOrdersTable.credits) })
        .from(paymentOrdersTable)
        .where(and(eq(paymentOrdersTable.status, "PAID"), gte(paymentOrdersTable.approvedAt, since)))
    : await db.select({ total: sum(paymentOrdersTable.credits) })
        .from(paymentOrdersTable)
        .where(eq(paymentOrdersTable.status, "PAID"));

  const usageQuery = db.select({
    totalCost: sum(aiUsageTable.totalCost),
    inputTokens: sum(aiUsageTable.inputTokens),
    outputTokens: sum(aiUsageTable.outputTokens),
    requests: count(),
  }).from(aiUsageTable);

  const [usage] = since
    ? await usageQuery.where(gte(aiUsageTable.createdAt, since))
    : await usageQuery;

  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);

  const creditsUsed = usage.totalCost ?? 0;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  // Rough cost estimation: $0.00014 per 1k input tokens, $0.00028 per 1k output tokens
  const estimatedCost = (Number(inputTokens) / 1000) * 0.00014 + (Number(outputTokens) / 1000) * 0.00028;
  const estimatedRevenue = Number(totalRevenue ?? 0) / 15000; // IDR to USD rough conversion
  const estimatedMargin = estimatedRevenue > 0 ? ((estimatedRevenue - estimatedCost) / estimatedRevenue) * 100 : 0;

  res.json({
    totalRevenue: Number(totalRevenue ?? 0),
    creditsSold: Number(creditsSold ?? 0),
    creditsUsed: Number(creditsUsed),
    totalRequests: usage.requests,
    inputTokens: Number(inputTokens),
    outputTokens: Number(outputTokens),
    estimatedCost,
    estimatedRevenue,
    estimatedMargin,
    totalUsers,
  });
});

export default router;
