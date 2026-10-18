import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword } from "../lib/hash.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getSetting } from "../lib/settings.js";
import { createAuditLog } from "../lib/audit.js";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }

  const registrationEnabled = await getSetting("registrationEnabled");
  if (registrationEnabled === "false") {
    res.status(403).json({ error: "Registration is currently disabled" });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const defaultCredits = parseInt(await getSetting("defaultCredits") || "50", 10);
  const hashedPassword = await hashPassword(password);

  const [user] = await db.insert(usersTable).values({
    email,
    password: hashedPassword,
    name,
    credits: defaultCredits,
    role: "USER",
  }).returning();

  await createAuditLog("REGISTER", "users", { userId: user.id, details: { email } });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: user.credits,
      isEnabled: user.isEnabled,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error" });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isEnabled) {
    res.status(403).json({ error: "Account is disabled" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: user.credits,
      isEnabled: user.isEnabled,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    credits: user.credits,
    isEnabled: user.isEnabled,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
