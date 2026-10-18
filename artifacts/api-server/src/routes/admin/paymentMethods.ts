import { Router } from "express";
import { db } from "@workspace/db";
import { paymentMethodsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../../lib/audit.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

function formatMethod(m: any) {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    isActive: m.isActive,
    details: m.details ?? {},
    createdAt: m.createdAt.toISOString(),
  };
}

const methodSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  details: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const items = await db.select().from(paymentMethodsTable).orderBy(paymentMethodsTable.name);
  res.json(items.map(formatMethod));
});

router.post("/", async (req: AuthRequest, res) => {
  const parsed = methodSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [item] = await db.insert(paymentMethodsTable).values({
    ...parsed.data,
    details: parsed.data.details ?? {},
    isActive: parsed.data.isActive ?? true,
  }).returning();
  await createAuditLog("CREATE_PAYMENT_METHOD", "payment_methods", { userId: req.user!.userId });
  res.status(201).json(formatMethod(item));
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = methodSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [existing] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, String(req.params.id))).limit(1);
  if (!existing) { res.status(404).json({ error: "Payment method not found" }); return; }
  const [updated] = await db.update(paymentMethodsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(paymentMethodsTable.id, String(req.params.id)))
    .returning();
  res.json(formatMethod(updated));
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, String(req.params.id))).limit(1);
  if (!existing) { res.status(404).json({ error: "Payment method not found" }); return; }
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, String(req.params.id)));
  res.json({ message: "Payment method deleted" });
});

export default router;
