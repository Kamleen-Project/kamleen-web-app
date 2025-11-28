import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

async function resolveStripeSecretKey(): Promise<string> {
  // Prefer DB-configured secret in PaymentGateway, fallback to env
  const gateway = await prisma.paymentGateway.findUnique({ where: { key: "stripe" } })
  const fromConfig =
    (gateway?.config as null | { secretKey?: string })?.secretKey &&
    typeof (gateway?.config as { secretKey?: unknown }).secretKey === "string"
      ? ((gateway?.config as { secretKey?: string }).secretKey as string)
      : null
  const key = fromConfig && !fromConfig.startsWith("env:")
    ? fromConfig
    : process.env[(fromConfig?.slice(4) as string) || "STRIPE_SECRET_KEY"] || process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing Stripe secret key (DB or STRIPE_SECRET_KEY)")
  return key
}

async function postFormEncoded(url: string, form: Record<string, string>, secretKey: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(form)
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Stripe API error ${resp.status}: ${text}`)
  }
  return (await resp.json()) as Record<string, unknown>
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const secret = await resolveStripeSecretKey()
    const url = "https://api.stripe.com/v1/checkout/sessions"

    const form: Record<string, string> = {
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      "line_items[0][price_data][currency]": params.currency,
      "line_items[0][price_data][unit_amount]": String(params.amount),
      "line_items[0][price_data][product_data][name]": params.description,
      "line_items[0][quantity]": "1",
      ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      ...(params.metadata
        ? Object.fromEntries(Object.entries(params.metadata).map(([k, v]) => [`metadata[${k}]`, v]))
        : {}),
    }

    const session = await postFormEncoded(url, form, secret)
    const urlOut = (session["url"] as string) ?? ""
    const sessionId = (session["id"] as string) ?? null
    return { url: urlOut, providerPaymentId: sessionId }
  },

  async createRefund(params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult> {
    const secret = await resolveStripeSecretKey()
    const url = "https://api.stripe.com/v1/refunds"
    const form: Record<string, string> = {
      payment_intent: params.paymentProviderId,
      amount: String(params.amount),
      ...(params.reason ? { reason: params.reason } : {}),
    }
    const refund = await postFormEncoded(url, form, secret)
    return { providerRefundId: (refund.id as string) ?? null }
  },
}

export function verifyStripeWebhookSignature({
  payload,
  header,
  secret,
  tolerance = 300,
}: {
  payload: string
  header: string | null
  secret: string
  tolerance?: number
}): boolean {
  if (!header) return false
  const items = header.split(",")
  const sigMap = Object.fromEntries(items.map((p) => p.split("=", 2) as [string, string])) as Record<string, string>
  const t = sigMap["t"]
  const signatures = (sigMap["v1"] ?? "").split(" ")
  if (!t || !signatures.length) return false
  const signedPayload = `${t}.${payload}`
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex")
  const ts = Number(t)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) return false
  return signatures.some((s) => s === expected)
}


