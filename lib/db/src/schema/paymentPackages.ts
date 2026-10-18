import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentPackagesTable = pgTable("payment_packages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in IDR
  credits: integer("credits").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentPackageSchema = createInsertSchema(paymentPackagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentPackage = z.infer<typeof insertPaymentPackageSchema>;
export type PaymentPackage = typeof paymentPackagesTable.$inferSelect;
