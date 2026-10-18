import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const creditLedgerTable = pgTable("credit_ledger", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // positive = credit, negative = debit
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  type: text("type").notNull(), // PURCHASE, AI_USAGE, ADMIN_ADD, ADMIN_REMOVE, ADMIN_SET, ADMIN_RESET, REFUND
  description: text("description").notNull(),
  adminId: text("admin_id").references(() => usersTable.id),
  orderId: text("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCreditLedgerSchema = createInsertSchema(creditLedgerTable).omit({ id: true, createdAt: true });
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;
export type CreditLedger = typeof creditLedgerTable.$inferSelect;
