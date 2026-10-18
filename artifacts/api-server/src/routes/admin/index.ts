import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../../middleware/auth.js";
import statsRouter from "./stats.js";
import revenueRouter from "./revenue.js";
import usersRouter from "./users.js";
import tokenPricingRouter from "./tokenPricing.js";
import packagesRouter from "./packages.js";
import paymentMethodsRouter from "./paymentMethods.js";
import ordersRouter from "./orders.js";
import aiUsageRouter from "./aiUsage.js";
import auditLogsRouter from "./auditLogs.js";
import settingsRouter from "./settings.js";

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.use("/stats", statsRouter);
router.use("/revenue", revenueRouter);
router.use("/users", usersRouter);
router.use("/token-pricing", tokenPricingRouter);
router.use("/packages", packagesRouter);
router.use("/payment-methods", paymentMethodsRouter);
router.use("/orders", ordersRouter);
router.use("/ai-usage", aiUsageRouter);
router.use("/audit-logs", auditLogsRouter);
router.use("/settings", settingsRouter);

export default router;
