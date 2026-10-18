import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

// GET /api/conversations
router.get("/", async (req: AuthRequest, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const conditions = [eq(conversationsTable.userId, req.user!.userId)];
  if (search) {
    conditions.push(ilike(conversationsTable.title, `%${search}%`));
  }

  const conversations = await db
    .select({
      id: conversationsTable.id,
      userId: conversationsTable.userId,
      title: conversationsTable.title,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: sql<number>`(SELECT COUNT(*) FROM messages WHERE conversation_id = ${conversationsTable.id})`.as("message_count"),
    })
    .from(conversationsTable)
    .where(and(...conditions))
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(conversations.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
});

// POST /api/conversations
router.post("/", async (req: AuthRequest, res) => {
  const schema = z.object({ title: z.string().min(1).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [conv] = await db.insert(conversationsTable).values({
    userId: req.user!.userId,
    title: parsed.data.title,
  }).returning();

  res.status(201).json({
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  });
});

// GET /api/conversations/:id
router.get("/:id", async (req: AuthRequest, res) => {
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, String(req.params.id)), eq(conversationsTable.userId, req.user!.userId)))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(messagesTable.createdAt);

  res.json({
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

// PATCH /api/conversations/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  const schema = z.object({ title: z.string().min(1).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, String(req.params.id)), eq(conversationsTable.userId, req.user!.userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [updated] = await db
    .update(conversationsTable)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(eq(conversationsTable.id, String(req.params.id)))
    .returning();

  res.json({
    id: updated.id,
    userId: updated.userId,
    title: updated.title,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /api/conversations/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, String(req.params.id)), eq(conversationsTable.userId, req.user!.userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(conversationsTable).where(eq(conversationsTable.id, String(req.params.id)));
  res.json({ message: "Conversation deleted" });
});

export default router;
