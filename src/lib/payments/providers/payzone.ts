import crypto from "crypto"

import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"
import { prisma } from "@/lib/prisma"

async function resolveConfig(): Promise<{ secret: string; gatewayBase: string }> {
  const gw = await prisma.paymentGateway.findUnique({ where: { key: "payzone" } })
  const cfg = (gw?.config as null | { secretKey?: string; gatewayUrl?: string }) || {}
  const fromCfgSecret = typeof cfg.secretKey === "string" ? cfg.secretKey : null
  const secret =
    (fromCfgSecret && !fromCfgSecret.startsWith("env:")) ? fromCfgSecret :
    (fromCfgSecret?.startsWith("env:") ? process.env[fromCfgSecret.slice(4)] : undefined) ||
    process.env.PAYZONE_SECRET_KEY
  if (!secret) throw new Error("Missing Payzone secret key (DB or PAYZONE_SECRET_KEY)")
  const gatewayBase = (typeof cfg.gatewayUrl === "string" && cfg.gatewayUrl.length > 0)
    ? cfg.gatewayUrl
    : (process.env.PAYZONE_GATEWAY_URL || "https://secure.payzone.ma/checkout")
  return { secret, gatewayBase }
}

function buildSignature(payload: Record<string, string>, secret: string): string {
  const sorted = Object.keys(payload).sort()
  const base = sorted.map((k) => `${k}=${payload[k]}`).join("&")
  return crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex")
}

export function verifyPayzoneSignature(payload: Record<string, string>, signature: string | null): boolean {
  if (!signature) return false
  const secret = getSecret()
  const copy: Record<string, string> = { ...payload }
  delete (copy as Record<string, unknown>)["signature"]
  const expected = buildSignature(copy, secret)
  return expected === signature
}

export const payzoneProvider: PaymentProvider = {
  id: "payzone",

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const { secret, gatewayBase } = await resolveConfig()
    const ipn = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/payzone`

    // Build minimal payload. We include booking/payment metadata via orderId and custom fields if supported
    const payload: Record<string, string> = {
      orderId: params.metadata?.paymentId || params.bookingId,
      amount: String(params.amount),
      currency: params.currency,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      ipnUrl: ipn,
      description: params.description,
      ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
    }
    const signature = buildSignature(payload, secret)
    const url = new URL(gatewayBase)
    Object.entries({ ...payload, signature }).forEach(([k, v]) => url.searchParams.set(k, v))
    return { url: url.toString(), providerPaymentId: payload.orderId }
  },

  async createRefund(_params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult> {
    // Implement if Payzone supports API refunds; otherwise throw. For now, not supported.
    throw new Error("Payzone refunds are not supported via API")
  },
}


