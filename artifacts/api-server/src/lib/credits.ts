import { db } from "@workspace/db";
import { tokenPricingTable, type TokenPricing } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface CreditCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  pricing: TokenPricing;
}

export async function calculateCreditCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<CreditCost | null> {
  const pricing = await db
    .select()
    .from(tokenPricingTable)
    .where(eq(tokenPricingTable.model, model))
    .limit(1)
    .then((rows) => rows[0]);

  if (!pricing) return null;

  const roundFn =
    pricing.rounding === "floor"
      ? Math.floor
      : pricing.rounding === "ceil"
        ? Math.ceil
        : Math.round;

  const inputCost = Math.max(
    0,
    roundFn((inputTokens / pricing.tokenUnit) * pricing.inputPrice)
  );
  const outputCost = Math.max(
    0,
    roundFn((outputTokens / pricing.tokenUnit) * pricing.outputPrice)
  );
  const rawTotal = inputCost + outputCost;
  const totalCost = Math.max(pricing.minimumCharge, rawTotal);

  return { inputCost, outputCost, totalCost, pricing };
}
