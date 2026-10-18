import { Router } from "express";
import { db } from "@workspace/db";
import { aiUsageTable, usersTable } from "@workspace/db";
import { eq, desc, count, sum } from "drizzle-orm";

const router = Router();

// GET /api/admin/ai-usage
router.get("/", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
  const offset = parseInt(String(req.query.offset || "0"), 10);

  const baseQuery = db
    .select({
      id: aiUsageTable.id,
      userId: aiUsageTable.userId,
      conversationId: aiUsageTable.conversationId,
      messageId: aiUsageTable.messageId,
      model: aiUsageTable.model,
      inputTokens: aiUsageTable.inputTokens,
      outputTokens: aiUsageTable.outputTokens,
      inputCost: aiUsageTable.inputCost,
      outputCost: aiUsageTable.outputCost,
      totalCost: aiUsageTable.totalCost,
      createdAt: aiUsageTable.createdAt,
      userName: usersTable.name,
    })
    .from(aiUsageTable)
    .leftJoin(usersTable, eq(aiUsageTable.userId, usersTable.id));

  const items = userId
    ? await baseQuery.where(eq(aiUsageTable.userId, userId)).orderBy(desc(aiUsageTable.createdAt)).limit(limit).offset(offset)
    : await baseQuery.orderBy(desc(aiUsageTable.createdAt)).limit(limit).offset(offset);

  const countQuery = db.select({ total: count(), totalInputTokens: sum(aiUsageTable.inputTokens), totalOutputTokens: sum(aiUsageTable.outputTokens), totalCost: sum(aiUsageTable.totalCost) }).from(aiUsageTable);
  const [totals] = userId ? await countQuery.where(eq(aiUsageTable.userId, userId)) : await countQuery;

  res.json({
    items: items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      userName: i.userName ?? null,
    })),
    total: totals.total,
    totalInputTokens: Number(totals.totalInputTokens ?? 0),
    totalOutputTokens: Number(totals.totalOutputTokens ?? 0),
    totalCost: Number(totals.totalCost ?? 0),
  });
});

export default router;
