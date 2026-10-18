/**
 * Seed script — run once to populate initial data.
 * Usage: pnpm --filter @workspace/api-server run seed
 */
import { db } from "@workspace/db";
import {
  usersTable,
  paymentPackagesTable,
  paymentMethodsTable,
  tokenPricingTable,
  settingsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@askmeeai.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
  if (existing.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.insert(usersTable).values({
      email: adminEmail,
      name: "Super Admin",
      password: hash,
      role: "ADMIN",
      credits: 99999,
      isEnabled: true,
    });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`⏭️  Admin already exists: ${adminEmail}`);
  }

  // ── Default packages ────────────────────────────────────────────────────────
  const pkgCount = await db.select().from(paymentPackagesTable);
  if (pkgCount.length === 0) {
    await db.insert(paymentPackagesTable).values([
      { name: "Starter",   price: 15000,  credits: 500,   description: "Perfect for casual users", isActive: true },
      { name: "Basic",     price: 25000,  credits: 1000,  description: "Great for regular use", isActive: true },
      { name: "Pro",       price: 50000,  credits: 2500,  description: "Best value for power users", isActive: true },
      { name: "Unlimited", price: 100000, credits: 6000,  description: "For heavy AI users", isActive: true },
    ]);
    console.log("✅ Payment packages seeded");
  } else {
    console.log("⏭️  Packages already exist");
  }

  // ── Default payment methods ─────────────────────────────────────────────────
  const methodCount = await db.select().from(paymentMethodsTable);
  if (methodCount.length === 0) {
    await db.insert(paymentMethodsTable).values([
      { name: "QRIS",          type: "QRIS",          details: { info: "Scan QRIS code" }, isActive: true },
      { name: "DANA",          type: "E-Wallet",      details: { accountNumber: "081234567890", accountName: "AskMeAI" }, isActive: true },
      { name: "GoPay",         type: "E-Wallet",      details: { accountNumber: "081234567890", accountName: "AskMeAI" }, isActive: true },
      { name: "OVO",           type: "E-Wallet",      details: { accountNumber: "081234567890", accountName: "AskMeAI" }, isActive: true },
      { name: "Bank Transfer", type: "Bank Transfer",  details: { bank: "BCA", accountNumber: "1234567890", accountName: "PT AskMeAI Indonesia" }, isActive: true },
    ]);
    console.log("✅ Payment methods seeded");
  } else {
    console.log("⏭️  Payment methods already exist");
  }

  // ── Default token pricing ───────────────────────────────────────────────────
  const pricingCount = await db.select().from(tokenPricingTable);
  if (pricingCount.length === 0) {
    await db.insert(tokenPricingTable).values([
      {
        model: "deepseek-v4-pro",
        inputPrice: 2,
        outputPrice: 10,
        tokenUnit: 1000,
        minimumCharge: 1,
        rounding: "ceil",
        isActive: true,
      },
    ]);
    console.log("✅ Token pricing seeded (deepseek-v4-pro: 2 input / 10 output per 1k)");
  } else {
    console.log("⏭️  Token pricing already exists");
  }

  // ── Default settings ────────────────────────────────────────────────────────
  const settingsToSet = [
    { key: "appName",               value: "AskMeAI" },
    { key: "defaultCredits",        value: "50" },
    { key: "registrationEnabled",   value: "true" },
    { key: "maintenanceMode",       value: "false" },
  ];

  for (const { key, value } of settingsToSet) {
    await db
      .insert(settingsTable)
      .values({ key, value })
      .onConflictDoNothing();
  }
  console.log("✅ Default settings seeded");

  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
