import { Router } from "express";
import { getAllSettings, setSetting } from "../../lib/settings.js";
import { z } from "zod";

const router = Router();

// GET /api/admin/settings
router.get("/", async (req, res) => {
  const settings = await getAllSettings();
  res.json({
    appName: settings.appName || "AskMeAI",
    registrationEnabled: settings.registrationEnabled !== "false",
    defaultCredits: parseInt(settings.defaultCredits || "50", 10),
    maintenanceMode: settings.maintenanceMode === "true",
  });
});

// PATCH /api/admin/settings
router.patch("/", async (req, res) => {
  const schema = z.object({
    appName: z.string().min(1).optional(),
    registrationEnabled: z.boolean().optional(),
    defaultCredits: z.number().min(0).optional(),
    maintenanceMode: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }

  const { appName, registrationEnabled, defaultCredits, maintenanceMode } = parsed.data;
  if (appName !== undefined) await setSetting("appName", appName);
  if (registrationEnabled !== undefined) await setSetting("registrationEnabled", String(registrationEnabled));
  if (defaultCredits !== undefined) await setSetting("defaultCredits", String(defaultCredits));
  if (maintenanceMode !== undefined) await setSetting("maintenanceMode", String(maintenanceMode));

  const settings = await getAllSettings();
  res.json({
    appName: settings.appName || "AskMeAI",
    registrationEnabled: settings.registrationEnabled !== "false",
    defaultCredits: parseInt(settings.defaultCredits || "50", 10),
    maintenanceMode: settings.maintenanceMode === "true",
  });
});

export default router;
