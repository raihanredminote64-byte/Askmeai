import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import conversationsRouter from "./conversations.js";
import chatRouter from "./chat.js";
import creditsRouter from "./credits.js";
import packagesRouter from "./packages.js";
import paymentMethodsRouter from "./paymentMethods.js";
import ordersRouter from "./orders.js";
import storageRouter from "./storage.js";
import adminRouter from "./admin/index.js";

const router: IRouter = Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many chat requests, please slow down." },
});

router.use(healthRouter);
router.use("/auth", authLimiter, authRouter);
router.use("/conversations", conversationsRouter);
router.use("/chat", chatLimiter, chatRouter);
router.use("/credits", creditsRouter);
router.use("/packages", packagesRouter);
router.use("/payment-methods", paymentMethodsRouter);
router.use("/orders", ordersRouter);
router.use(storageRouter);
router.use("/admin", adminRouter);

export default router;
