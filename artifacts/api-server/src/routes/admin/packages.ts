import { Router } from "express";
import { db } from "@workspace/db";
import { paymentPackagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../../lib/audit.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

function formatPkg(p: any) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    credits: p.credits,
    isActive: p.isActive,
    description: p.description ?? null,
  };
}

const pkgSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  credits: z.number().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/packages
router.get("/", async (req, res) => {
  const items = await db.select().from(paymentPackagesTable).orderBy(paymentPackagesTable.price);
  res.json(items.map(formatPkg));
});

// POST /api/admin/packages
router.post("/", async (req: AuthRequest, res) => {
  const parsed = pkgSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }
  const [item] = await db.insert(paymentPackagesTable).values({
    ...parsed.data,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  await createAuditLog("CREATE_PACKAGE", "packages", { userId: req.user!.userId, resourceId: item.id });
  res.status(201).json(formatPkg(item));
});

// PATCH /api/admin/packages/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = pkgSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }
  const [existing] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, String(req.params.id))).limit(1);
  if (!existing) { res.status(404).json({ error: "Package not found" }); return; }
  const [updated] = await db.update(paymentPackagesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(paymentPackagesTable.id, String(req.params.id))).returning();
  res.json(formatPkg(updated));
});

// DELETE /api/admin/packages/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, String(req.params.id))).limit(1);
  if (!existing) { res.status(404).json({ error: "Package not found" }); return; }
  await db.delete(paymentPackagesTable).where(eq(paymentPackagesTable.id, String(req.params.id)));
  res.json({ message: "Package deleted" });
});

export default router;
