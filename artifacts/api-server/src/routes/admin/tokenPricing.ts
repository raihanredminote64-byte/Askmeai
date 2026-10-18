import { Router } from "express";
import { db } from "@workspace/db";
import { tokenPricingTable, tokenPricingHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../../lib/audit.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

function formatPricing(p: any) {
  return {
    id: p.id,
    model: p.model,
    inputPrice: p.inputPrice,
    outputPrice: p.outputPrice,
    tokenUnit: p.tokenUnit,
    minimumCharge: p.minimumCharge,
    rounding: p.rounding,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const pricingSchema = z.object({
  model: z.string().min(1),
  inputPrice: z.number().min(0),
  outputPrice: z.number().min(0),
  tokenUnit: z.number().min(1),
  minimumCharge: z.number().min(0),
  rounding: z.enum(["floor", "ceil", "round"]),
  isActive: z.boolean().optional(),
});

// GET /api/admin/token-pricing
router.get("/", async (req, res) => {
  const items = await db.select().from(tokenPricingTable).orderBy(tokenPricingTable.createdAt);
  res.json(items.map(formatPricing));
});

// POST /api/admin/token-pricing
router.post("/", async (req: AuthRequest, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [item] = await db.insert(tokenPricingTable).values({
    ...parsed.data,
    isActive: parsed.data.isActive ?? true,
  }).returning();

  await createAuditLog("CREATE_TOKEN_PRICING", "token_pricing", {
    userId: req.user!.userId,
    resourceId: item.id,
    details: parsed.data,
  });

  res.status(201).json(formatPricing(item));
});

// PATCH /api/admin/token-pricing/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  const schema = pricingSchema.partial();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [existing] = await db
    .select()
    .from(tokenPricingTable)
    .where(eq(tokenPricingTable.id, String(req.params.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Token pricing not found" });
    return;
  }

  // Save history snapshot before update
  await db.insert(tokenPricingHistoryTable).values({
    pricingId: existing.id,
    model: existing.model,
    inputPrice: existing.inputPrice,
    outputPrice: existing.outputPrice,
    tokenUnit: existing.tokenUnit,
    minimumCharge: existing.minimumCharge,
    rounding: existing.rounding,
    changedBy: req.user!.userId,
  });

  const [updated] = await db
    .update(tokenPricingTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tokenPricingTable.id, String(req.params.id)))
    .returning();

  await createAuditLog("UPDATE_TOKEN_PRICING", "token_pricing", {
    userId: req.user!.userId,
    resourceId: updated.id,
    details: parsed.data,
  });

  res.json(formatPricing(updated));
});

export default router;
