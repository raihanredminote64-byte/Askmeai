import { Router } from "express";
import { db } from "@workspace/db";
import { paymentMethodsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/payment-methods
router.get("/", async (req, res) => {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.isActive, true))
    .orderBy(paymentMethodsTable.name);

  res.json(methods.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    isActive: m.isActive,
    details: m.details ?? {},
  })));
});

export default router;
