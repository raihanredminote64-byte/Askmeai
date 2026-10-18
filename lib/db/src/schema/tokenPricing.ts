import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roundingEnum = pgEnum("rounding_mode", ["floor", "ceil", "round"]);

export const tokenPricingTable = pgTable("token_pricing", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  model: text("model").notNull(),
  inputPrice: integer("input_price").notNull(), // credits per tokenUnit input tokens
  outputPrice: integer("output_price").notNull(), // credits per tokenUnit output tokens
  tokenUnit: integer("token_unit").notNull().default(1000), // e.g. per 1000 tokens
  minimumCharge: integer("minimum_charge").notNull().default(1), // minimum credits per request
  rounding: roundingEnum("rounding").notNull().default("ceil"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Snapshot table to preserve pricing history in AI usage records
export const tokenPricingHistoryTable = pgTable("token_pricing_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pricingId: text("pricing_id").notNull().references(() => tokenPricingTable.id),
  model: text("model").notNull(),
  inputPrice: integer("input_price").notNull(),
  outputPrice: integer("output_price").notNull(),
  tokenUnit: integer("token_unit").notNull(),
  minimumCharge: integer("minimum_charge").notNull(),
  rounding: text("rounding").notNull(),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const insertTokenPricingSchema = createInsertSchema(tokenPricingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTokenPricing = z.infer<typeof insertTokenPricingSchema>;
export type TokenPricing = typeof tokenPricingTable.$inferSelect;
export type TokenPricingHistory = typeof tokenPricingHistoryTable.$inferSelect;
