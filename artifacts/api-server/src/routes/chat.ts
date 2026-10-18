import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  usersTable,
  aiUsageTable,
  creditLedgerTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { calculateCreditCost } from "../lib/credits.js";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const client = new OpenAI({
  apiKey: process.env["NINEINFERENCE_API_KEY"] || "",
  baseURL: process.env["NINEINFERENCE_BASE_URL"] || "https://9inference.cloud/v1",
});

const MODEL = process.env["AI_MODEL"] || "deepseek-v4-pro";

const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(10000),
});

// POST /api/chat
router.post("/", async (req: AuthRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const { conversationId, message } = parsed.data;
  const userId = req.user!.userId;

  // Verify conversation ownership (IDOR protection)
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Check user credits (server-side, never trust frontend)
  const [userRow] = await db
    .select({ credits: usersTable.credits, isEnabled: usersTable.isEnabled })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!userRow || !userRow.isEnabled) {
    res.status(403).json({ error: "Account is disabled" });
    return;
  }

  if (userRow.credits < 1) {
    res.status(402).json({ error: "Insufficient credits. Please top up to continue." });
    return;
  }

  // Load conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt)
    .limit(50);

  // Save user message first
  const [userMessage] = await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: message,
  }).returning();

  // Update conversation updatedAt
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  // Auto-title after first message if still default
  if (conv.title === "New Chat" && history.length === 0) {
    const shortTitle = message.length > 60 ? message.slice(0, 60) + "..." : message;
    await db
      .update(conversationsTable)
      .set({ title: shortTitle, updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));
  }

  // Build messages for AI
  const aiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are AskMeAI, a helpful and intelligent AI assistant. Be concise, accurate, and helpful. Format code with markdown code blocks.",
    },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // Set up SSE streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let assistantMessageId: string | null = null;

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: aiMessages,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }

      // Capture usage from last chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
    }

    // Save assistant message
    const [assistantMessage] = await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullContent,
    }).returning();
    assistantMessageId = assistantMessage.id;

    // Calculate and deduct credits (server-side)
    const creditCost = await calculateCreditCost(MODEL, inputTokens, outputTokens);
    if (creditCost) {
      const currentUser = await db
        .select({ credits: usersTable.credits })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
        .then((r) => r[0]);

      if (currentUser) {
        const newCredits = Math.max(0, currentUser.credits - creditCost.totalCost);

        await db.transaction(async (tx) => {
          await tx
            .update(usersTable)
            .set({ credits: newCredits })
            .where(eq(usersTable.id, userId));

          await tx.insert(creditLedgerTable).values({
            userId,
            amount: -creditCost.totalCost,
            balanceBefore: currentUser.credits,
            balanceAfter: newCredits,
            type: "AI_USAGE",
            description: `AI response: ${inputTokens} input + ${outputTokens} output tokens`,
          });

          await tx.insert(aiUsageTable).values({
            userId,
            conversationId,
            messageId: assistantMessageId!,
            model: MODEL,
            inputTokens,
            outputTokens,
            inputCost: creditCost.inputCost,
            outputCost: creditCost.outputCost,
            totalCost: creditCost.totalCost,
            pricingSnapshot: {
              pricingId: creditCost.pricing.id,
              inputPrice: creditCost.pricing.inputPrice,
              outputPrice: creditCost.pricing.outputPrice,
              tokenUnit: creditCost.pricing.tokenUnit,
              minimumCharge: creditCost.pricing.minimumCharge,
              rounding: creditCost.pricing.rounding,
            },
          });
        });
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || "AI request failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
