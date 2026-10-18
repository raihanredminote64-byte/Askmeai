import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

// GET /api/admin/audit-logs
router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
  const offset = parseInt(String(req.query.offset || "0"), 10);

  const items = await db
    .select({
      id: auditLogsTable.id,
      userId: auditLogsTable.userId,
      action: auditLogsTable.action,
      resource: auditLogsTable.resource,
      resourceId: auditLogsTable.resourceId,
      details: auditLogsTable.details,
      createdAt: auditLogsTable.createdAt,
      userEmail: usersTable.email,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(auditLogsTable);

  res.json({
    items: items.map((i) => ({
      id: i.id,
      userId: i.userId ?? null,
      userEmail: i.userEmail ?? null,
      action: i.action,
      resource: i.resource,
      resourceId: i.resourceId ?? null,
      details: i.details ?? {},
      createdAt: i.createdAt.toISOString(),
    })),
    total,
  });
});

export default router;
