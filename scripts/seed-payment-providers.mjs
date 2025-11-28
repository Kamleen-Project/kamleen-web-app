#!/usr/bin/env node
/* eslint-disable no-console */
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const providers = [
  {
    key: "stripe",
    name: "Stripe",
    type: "CARD",
    logoUrl: "/public/images/logo.png", // replace as needed
    isEnabled: false,
    testMode: true,
    config: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      secretKey: process.env.STRIPE_SECRET_KEY ? "env:STRIPE_SECRET_KEY" : "",
    },
  },
  {
    key: "paypal",
    name: "PayPal",
    type: "PAYPAL",
    logoUrl: "/public/images/logo.png",
    isEnabled: false,
    testMode: true,
    config: {
      clientId: process.env.PAYPAL_CLIENT_ID || "",
      clientSecret: process.env.PAYPAL_CLIENT_SECRET ? "env:PAYPAL_CLIENT_SECRET" : "",
    },
  },
  {
    key: "payzone",
    name: "Payzone",
    type: "CARD",
    logoUrl: "/public/images/logo.png",
    isEnabled: false,
    testMode: true,
    config: {
      merchantId: process.env.PAYZONE_MERCHANT_ID || "",
      siteId: process.env.PAYZONE_SITE_ID || "",
      currency: process.env.PAYZONE_CURRENCY || "MAD",
      gatewayUrl: process.env.PAYZONE_GATEWAY_URL || "",
      secretKey: process.env.PAYZONE_SECRET_KEY ? "env:PAYZONE_SECRET_KEY" : "",
    },
  },
  {
    key: "cmi",
    name: "CMI",
    type: "CARD",
    logoUrl: "/public/images/logo.png",
    isEnabled: false,
    testMode: true,
    config: {
      merchantId: process.env.CMI_MERCHANT_ID || "",
      terminalId: process.env.CMI_TERMINAL_ID || "",
      currency: process.env.CMI_CURRENCY || "MAD",
      storeKey: process.env.CMI_STORE_KEY ? "env:CMI_STORE_KEY" : "",
    },
  },
  {
    key: "cash",
    name: "Pay with Cash",
    type: "CASH",
    logoUrl: "/public/images/logo.png",
    isEnabled: false,
    testMode: true,
    config: {},
  },
];

async function main() {
  for (const p of providers) {
    await prisma.paymentGateway.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        type: p.type,
        logoUrl: p.logoUrl,
        isEnabled: p.isEnabled,
        testMode: p.testMode,
        config: p.config,
      },
      update: {
        name: p.name,
        type: p.type,
        logoUrl: p.logoUrl,
        isEnabled: p.isEnabled,
        testMode: p.testMode,
        config: p.config,
      },
    });
  }
  console.log("Seeded payment gateways.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


