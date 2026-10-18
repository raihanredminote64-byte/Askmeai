import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { conversationsTable } from "./conversations";
import { messagesTable } from "./messages";

export const aiUsageTable = pgTable("ai_usage", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => conversationsTable.id, { onDelete: "set null" }),
  messageId: text("message_id").references(() => messagesTable.id, { onDelete: "set null" }),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  inputCost: integer("input_cost").notNull(), // in credits
  outputCost: integer("output_cost").notNull(), // in credits
  totalCost: integer("total_cost").notNull(), // in credits
  pricingSnapshot: jsonb("pricing_snapshot").$type<{
    pricingId: string;
    inputPrice: number;
    outputPrice: number;
    tokenUnit: number;
    minimumCharge: number;
    rounding: string;
  }>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiUsageSchema = createInsertSchema(aiUsageTable).omit({ id: true, createdAt: true });
export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;
export type AiUsage = typeof aiUsageTable.$inferSelect;
