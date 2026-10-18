import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentOrdersTable,
  paymentPackagesTable,
  paymentMethodsTable,
  usersTable,
  creditLedgerTable,
} from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { createAuditLog } from "../../lib/audit.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { z } from "zod";

function proofServingUrl(proofPath: string | null | undefined): string | null {
  if (!proofPath) return null;
  return proofPath.startsWith("/objects/") ? `/api/storage${proofPath}` : proofPath;
}

const router = Router();

function formatAdminOrder(o: any, user: any, pkg: any, method: any) {
  return {
    id: o.id,
    userId: o.userId,
    packageId: o.packageId,
    methodId: o.methodId,
    amount: o.amount,
    credits: o.credits,
    status: o.status,
    proofPath: o.proofUrl?.startsWith("/objects/") ? o.proofUrl : null,
    proofUrl: proofServingUrl(o.proofUrl),
    proofValidationStatus: o.proofValidationStatus ?? "NOT_SUBMITTED",
    proofTransferDate: o.proofTransferDate ?? null,
    proofValidationConfidence: o.proofValidationConfidence ?? null,
    proofValidationReason: o.proofValidationReason ?? null,
    proofValidationSource: o.proofValidationSource ?? null,
    proofValidatedAt: o.proofValidatedAt ? o.proofValidatedAt.toISOString() : null,
    adminNote: o.adminNote ?? null,
    approvedBy: o.approvedBy ?? null,
    approvedAt: o.approvedAt ? o.approvedAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, credits: user.credits, isEnabled: user.isEnabled, createdAt: user.createdAt.toISOString() } : undefined,
    package: pkg ? { id: pkg.id, name: pkg.name, price: pkg.price, credits: pkg.credits, isActive: pkg.isActive, description: pkg.description ?? null } : undefined,
    paymentMethod: method ? { id: method.id, name: method.name, type: method.type, isActive: method.isActive, details: method.details ?? {} } : undefined,
  };
}

// GET /api/admin/orders
router.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
  const offset = parseInt(String(req.query.offset || "0"), 10);

  const baseQuery = db
    .select({
      order: paymentOrdersTable,
      user: usersTable,
      pkg: paymentPackagesTable,
      method: paymentMethodsTable,
    })
    .from(paymentOrdersTable)
    .leftJoin(usersTable, eq(paymentOrdersTable.userId, usersTable.id))
    .leftJoin(paymentPackagesTable, eq(paymentOrdersTable.packageId, paymentPackagesTable.id))
    .leftJoin(paymentMethodsTable, eq(paymentOrdersTable.methodId, paymentMethodsTable.id));

  const items = status
    ? await baseQuery.where(eq(paymentOrdersTable.status, status as any)).orderBy(desc(paymentOrdersTable.createdAt)).limit(limit).offset(offset)
    : await baseQuery.orderBy(desc(paymentOrdersTable.createdAt)).limit(limit).offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(paymentOrdersTable);

  res.json({
    items: items.map(({ order, user, pkg, method }) => formatAdminOrder(order, user, pkg, method)),
    total,
  });
});

// POST /api/admin/orders/:id/approve
router.post("/:id/approve", async (req: AuthRequest, res) => {
  const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, String(req.params.id))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "PENDING") { res.status(400).json({ error: "Order is not pending" }); return; }

  // Idempotency: prevent double credit
  if (order.creditApplied) {
    res.status(400).json({ error: "Credits already applied for this order" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const newCredits = user.credits + order.credits;

  await db.transaction(async (tx) => {
    await tx
      .update(paymentOrdersTable)
      .set({ status: "PAID", creditApplied: true, approvedBy: req.user!.userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(paymentOrdersTable.id, order.id));

    await tx.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, user.id));

    await tx.insert(creditLedgerTable).values({
      userId: user.id,
      amount: order.credits,
      balanceBefore: user.credits,
      balanceAfter: newCredits,
      type: "PURCHASE",
      description: `Payment approved: ${order.credits} credits (Order #${order.id.slice(0, 8)})`,
      adminId: req.user!.userId,
      orderId: order.id,
    });
  });

  await createAuditLog("APPROVE_ORDER", "orders", {
    userId: req.user!.userId,
    resourceId: order.id,
    details: { creditsAdded: order.credits, userId: order.userId },
  });

  const [updatedOrder] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, order.id)).limit(1);
  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
  const [pkg] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, order.packageId)).limit(1);
  const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, order.methodId)).limit(1);

  res.json(formatAdminOrder(updatedOrder, updatedUser, pkg, method));
});

// POST /api/admin/orders/:id/proof-validation
router.post("/:id/proof-validation", async (req: AuthRequest, res) => {
  const schema = z.object({
    status: z.enum(["VALID", "INVALID"]),
    reason: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation status is invalid" }); return; }
  if (parsed.data.status === "INVALID" && !parsed.data.reason) {
    res.status(400).json({ error: "A reason is required when marking proof invalid" });
    return;
  }

  const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, String(req.params.id))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "PENDING") { res.status(400).json({ error: "Only pending orders can be revalidated" }); return; }
  if (!order.proofUrl) { res.status(400).json({ error: "Payment proof is required first" }); return; }

  const reason = parsed.data.reason || (parsed.data.status === "VALID" ? "Manually validated by admin." : "Marked invalid by admin.");
  const [updatedOrder] = await db
    .update(paymentOrdersTable)
    .set({
      proofValidationStatus: parsed.data.status,
      proofValidationReason: reason,
      proofValidationSource: "MANUAL",
      proofValidatedAt: new Date(),
      proofValidatedBy: req.user!.userId,
      updatedAt: new Date(),
    })
    .where(eq(paymentOrdersTable.id, order.id))
    .returning();

  await createAuditLog("VALIDATE_PAYMENT_PROOF", "orders", {
    userId: req.user!.userId,
    resourceId: order.id,
    details: { status: parsed.data.status, reason },
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
  const [pkg] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, order.packageId)).limit(1);
  const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, order.methodId)).limit(1);
  res.json(formatAdminOrder(updatedOrder, user, pkg, method));
});

// POST /api/admin/orders/:id/reject
router.post("/:id/reject", async (req: AuthRequest, res) => {
  const schema = z.object({ reason: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Reason required" }); return; }

  const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, String(req.params.id))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "PENDING") { res.status(400).json({ error: "Order is not pending" }); return; }

  const [updatedOrder] = await db
    .update(paymentOrdersTable)
    .set({ status: "REJECTED", adminNote: parsed.data.reason, approvedBy: req.user!.userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(paymentOrdersTable.id, order.id))
    .returning();

  await createAuditLog("REJECT_ORDER", "orders", {
    userId: req.user!.userId,
    resourceId: order.id,
    details: { reason: parsed.data.reason },
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
  const [pkg] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, order.packageId)).limit(1);
  const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, order.methodId)).limit(1);

  res.json(formatAdminOrder(updatedOrder, user, pkg, method));
});

export default router;
