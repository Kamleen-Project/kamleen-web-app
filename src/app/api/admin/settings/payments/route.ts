import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPaymentSettings } from "@/lib/payments"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const settings = await getPaymentSettings()
  return NextResponse.json({ settings })
}

type PutPayload = {
  defaultProvider?: unknown
  enabledProviders?: unknown
  stripePublishableKey?: unknown
  stripeAccountCountry?: unknown
  cmiMerchantId?: unknown
  cmiTerminalId?: unknown
  cmiCurrency?: unknown
  payzoneMerchantId?: unknown
  payzoneSiteId?: unknown
  payzoneCurrency?: unknown
  payzoneGatewayUrl?: unknown
  paypalClientId?: unknown
  paypalClientSecret?: unknown
  testMode?: unknown
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as PutPayload | null
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })

  type UpdateData = Partial<{
    defaultProvider: "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL"
    enabledProviders: Array<"STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL">
    stripePublishableKey: string | null
    stripeAccountCountry: string | null
    cmiMerchantId: string | null
    cmiTerminalId: string | null
    cmiCurrency: string | null
    payzoneMerchantId: string | null
    payzoneSiteId: string | null
    payzoneCurrency: string | null
    payzoneGatewayUrl: string | null
    paypalClientId: string | null
    paypalClientSecret: string | null
    testMode: boolean
  }>
  const data: UpdateData = {}
  if (typeof body.defaultProvider === "string") data.defaultProvider = body.defaultProvider.toUpperCase() as UpdateData["defaultProvider"]
  if (Array.isArray(body.enabledProviders)) data.enabledProviders = (body.enabledProviders as string[]).map((p) => p.toUpperCase() as "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL")
  if (typeof body.stripePublishableKey === "string") data.stripePublishableKey = body.stripePublishableKey
  if (typeof body.stripeAccountCountry === "string") data.stripeAccountCountry = body.stripeAccountCountry
  if (typeof body.cmiMerchantId === "string") data.cmiMerchantId = body.cmiMerchantId
  if (typeof body.cmiTerminalId === "string") data.cmiTerminalId = body.cmiTerminalId
  if (typeof body.cmiCurrency === "string") data.cmiCurrency = body.cmiCurrency
  if (typeof body.payzoneMerchantId === "string") data.payzoneMerchantId = body.payzoneMerchantId
  if (typeof body.payzoneSiteId === "string") data.payzoneSiteId = body.payzoneSiteId
  if (typeof body.payzoneCurrency === "string") data.payzoneCurrency = body.payzoneCurrency
  if (typeof body.payzoneGatewayUrl === "string") data.payzoneGatewayUrl = body.payzoneGatewayUrl
  if (typeof body.paypalClientId === "string") data.paypalClientId = body.paypalClientId
  if (typeof body.paypalClientSecret === "string") data.paypalClientSecret = body.paypalClientSecret
  if (typeof body.testMode === "boolean") data.testMode = body.testMode

  const existing = await prisma.paymentSettings.findFirst()
  const settings = existing
    ? await prisma.paymentSettings.update({ where: { id: existing.id }, data })
    : await prisma.paymentSettings.create({ data: { defaultProvider: "STRIPE", enabledProviders: ["STRIPE"], ...data } })

  return NextResponse.json({ settings })
}


