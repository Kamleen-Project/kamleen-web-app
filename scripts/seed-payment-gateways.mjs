import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function seed() {
    const gateways = [
        {
            key: "stripe",
            name: "Stripe",
            type: "CARD",
            testMode: true,
            isEnabled: true,
            config: {
                publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
                secretKey: process.env.STRIPE_SECRET_KEY || "",
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
            },
        },
        {
            key: "paypal",
            name: "PayPal",
            type: "PAYPAL",
            testMode: true,
            isEnabled: true,
            config: {
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
            },
        },
        {
            key: "payzone",
            name: "Payzone",
            type: "CARD",
            testMode: true,
            isEnabled: false,
            config: {
                clientId: process.env.PAYZONE_CLIENT_ID || "",
                secretKey: process.env.PAYZONE_SECRET_KEY || "",
                gatewayUrl: process.env.PAYZONE_GATEWAY_URL || "",
            },
        },
        {
            key: "cmi",
            name: "CMI",
            type: "CARD",
            testMode: true,
            isEnabled: false,
            config: {
                clientId: process.env.CMI_CLIENT_ID || "",
                secretKey: process.env.CMI_SECRET_KEY || "",
                gatewayUrl: process.env.CMI_GATEWAY_URL || "",
            },
        },
        {
            key: "cash",
            name: "Cash",
            type: "CASH",
            testMode: true,
            isEnabled: true,
            config: {},
        },
    ]

    for (const g of gateways) {
        await prisma.paymentGateway.upsert({
            where: { key: g.key },
            update: {},
            create: {
                key: g.key,
                name: g.name,
                type: g.type,
                testMode: g.testMode,
                isEnabled: g.isEnabled,
                config: g.config,
            },
        })
    }
}

seed()
    .then(() => console.log("Seeded payment gateways"))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
