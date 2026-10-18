import { pgTable, text, integer, boolean, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { paymentPackagesTable } from "./paymentPackages";
import { paymentMethodsTable } from "./paymentMethods";

export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PAID", "REJECTED", "CANCELLED"]);

export const paymentOrdersTable = pgTable("payment_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  packageId: text("package_id").notNull().references(() => paymentPackagesTable.id),
  methodId: text("method_id").notNull().references(() => paymentMethodsTable.id),
  amount: integer("amount").notNull(), // in IDR
  credits: integer("credits").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  proofUrl: text("proof_url"),
  proofValidationStatus: text("proof_validation_status").notNull().default("NOT_SUBMITTED"),
  proofTransferDate: text("proof_transfer_date"),
  proofValidationConfidence: real("proof_validation_confidence"),
  proofValidationReason: text("proof_validation_reason"),
  proofValidationSource: text("proof_validation_source"),
  proofValidatedAt: timestamp("proof_validated_at"),
  proofValidatedBy: text("proof_validated_by").references(() => usersTable.id),
  adminNote: text("admin_note"),
  approvedBy: text("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at"),
  creditApplied: boolean("credit_applied").notNull().default(false), // Prevent double credit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentOrderSchema = createInsertSchema(paymentOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;
export type PaymentOrder = typeof paymentOrdersTable.$inferSelect;
