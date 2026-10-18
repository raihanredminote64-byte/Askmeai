import { Router } from "express";
import { db } from "@workspace/db";
import { paymentPackagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/packages
router.get("/", async (req, res) => {
  const packages = await db
    .select()
    .from(paymentPackagesTable)
    .where(eq(paymentPackagesTable.isActive, true))
    .orderBy(paymentPackagesTable.price);

  res.json(packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    credits: p.credits,
    isActive: p.isActive,
    description: p.description ?? null,
  })));
});

export default router;
