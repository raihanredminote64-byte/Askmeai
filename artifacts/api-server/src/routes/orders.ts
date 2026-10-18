import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentOrdersTable,
  paymentPackagesTable,
  paymentMethodsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { validatePaymentProof } from "../lib/paymentProofValidation.js";

const router = Router();
router.use(authMiddleware);
const objectStorageService = new ObjectStorageService();

function proofServingUrl(proofPath: string | null | undefined): string | null {
  if (!proofPath) return null;
  return proofPath.startsWith("/objects/") ? `/api/storage${proofPath}` : proofPath;
}

function formatOrder(o: any, pkg: any, method: any) {
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
    createdAt: o.createdAt.toISOString(),
    package: pkg ? {
      id: pkg.id, name: pkg.name, price: pkg.price, credits: pkg.credits,
      isActive: pkg.isActive, description: pkg.description ?? null,
    } : undefined,
    paymentMethod: method ? {
      id: method.id, name: method.name, type: method.type,
      isActive: method.isActive, details: method.details ?? {},
    } : undefined,
  };
}

// GET /api/orders
router.get("/", async (req: AuthRequest, res) => {
  const orders = await db
    .select({
      order: paymentOrdersTable,
      pkg: paymentPackagesTable,
      method: paymentMethodsTable,
    })
    .from(paymentOrdersTable)
    .leftJoin(paymentPackagesTable, eq(paymentOrdersTable.packageId, paymentPackagesTable.id))
    .leftJoin(paymentMethodsTable, eq(paymentOrdersTable.methodId, paymentMethodsTable.id))
    .where(eq(paymentOrdersTable.userId, req.user!.userId))
    .orderBy(desc(paymentOrdersTable.createdAt));

  res.json(orders.map(({ order, pkg, method }) => formatOrder(order, pkg, method)));
});

// POST /api/orders
router.post("/", async (req: AuthRequest, res) => {
  const schema = z.object({
    packageId: z.string().min(1),
    methodId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [pkg] = await db
    .select()
    .from(paymentPackagesTable)
    .where(and(eq(paymentPackagesTable.id, parsed.data.packageId), eq(paymentPackagesTable.isActive, true)))
    .limit(1);

  if (!pkg) {
    res.status(404).json({ error: "Package not found or inactive" });
    return;
  }

  const [method] = await db
    .select()
    .from(paymentMethodsTable)
    .where(and(eq(paymentMethodsTable.id, parsed.data.methodId), eq(paymentMethodsTable.isActive, true)))
    .limit(1);

  if (!method) {
    res.status(404).json({ error: "Payment method not found or inactive" });
    return;
  }

  const [order] = await db.insert(paymentOrdersTable).values({
    userId: req.user!.userId,
    packageId: pkg.id,
    methodId: method.id,
    amount: pkg.price,
    credits: pkg.credits,
    status: "PENDING",
  }).returning();

  res.status(201).json(formatOrder(order, pkg, method));
});

// GET /api/orders/:id
router.get("/:id", async (req: AuthRequest, res) => {
  const [result] = await db
    .select({
      order: paymentOrdersTable,
      pkg: paymentPackagesTable,
      method: paymentMethodsTable,
    })
    .from(paymentOrdersTable)
    .leftJoin(paymentPackagesTable, eq(paymentOrdersTable.packageId, paymentPackagesTable.id))
    .leftJoin(paymentMethodsTable, eq(paymentOrdersTable.methodId, paymentMethodsTable.id))
    .where(and(eq(paymentOrdersTable.id, String(req.params.id)), eq(paymentOrdersTable.userId, req.user!.userId)))
    .limit(1);

  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(formatOrder(result.order, result.pkg, result.method));
});

// POST /api/orders/:id/proof
router.post("/:id/proof", async (req: AuthRequest, res) => {
  const schema = z.object({ proofPath: z.string().startsWith("/objects/") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.id, String(req.params.id)), eq(paymentOrdersTable.userId, req.user!.userId)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "PENDING") {
    res.status(400).json({ error: "Order is not pending" });
    return;
  }

  let proofFile;
  try {
    proofFile = await objectStorageService.getObjectEntityFile(parsed.data.proofPath);
    const [metadata] = await proofFile.getMetadata();
    if (!/^image\/(png|jpeg|webp)$/.test(String(metadata.contentType || ""))) {
      res.status(400).json({ error: "Payment proof must be a PNG, JPEG, or WebP image" });
      return;
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(400).json({ error: "Payment proof file was not found" });
      return;
    }
    throw error;
  }

  const [updated] = await db
    .update(paymentOrdersTable)
    .set({
      proofUrl: parsed.data.proofPath,
      proofValidationStatus: "PENDING",
      proofValidationConfidence: null,
      proofValidationReason: "Automatic validation is in progress.",
      proofValidationSource: "AUTO",
      proofValidatedAt: null,
      proofValidatedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(paymentOrdersTable.id, order.id))
    .returning();
  const validation = await validatePaymentProof(proofFile, order.createdAt);
  const [validatedOrder] = await db
    .update(paymentOrdersTable)
    .set({
      proofValidationStatus: validation.status,
      proofTransferDate: validation.transferDate,
      proofValidationConfidence: validation.confidence,
      proofValidationReason: validation.reason,
      proofValidationSource: "AUTO",
      proofValidatedAt: new Date(),
      proofValidatedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(paymentOrdersTable.id, updated.id))
    .returning();

  const [pkg] = await db.select().from(paymentPackagesTable).where(eq(paymentPackagesTable.id, order.packageId)).limit(1);
  const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, order.methodId)).limit(1);

  res.json(formatOrder(validatedOrder, pkg, method));
});

export default router;
