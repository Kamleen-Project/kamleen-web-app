import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, ProviderCreateRefundParams, ProviderCreateRefundResult } from "@/lib/payments/types"
import { prisma } from "@/lib/prisma"

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) throw new Error(`Missing ${name}`)
  return v
}

async function resolvePaypalCredentials() {
  const settings = await prisma.paymentSettings.findFirst()
  const clientId = settings?.paypalClientId || process.env.PAYPAL_CLIENT_ID
  const secret = settings?.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error("Missing PayPal credentials (set in settings or env)")
  const testMode = settings?.testMode ?? (process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.TEST_MODE === "true")
  const base = testMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"
  return { clientId, secret, base }
}

async function getAccessToken(base: string, clientId: string, secret: string) {
  const url = `${base}/v1/oauth2/token`
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  })
  if (!resp.ok) throw new Error(`PayPal auth failed: ${resp.status}`)
  const data = (await resp.json()) as { access_token?: string }
  const token = data.access_token
  if (!token) throw new Error("PayPal auth: missing token")
  return token
}

export const paypalProvider: PaymentProvider = {
  id: "paypal",

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const { base, clientId, secret } = await resolvePaypalCredentials()
    const token = await getAccessToken(base, clientId, secret)

    const appBase = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0
      ? process.env.NEXT_PUBLIC_APP_URL
      : new URL(params.successUrl).origin
    const returnUrl = `${appBase}/api/payments/paypal/return?success=${encodeURIComponent(params.successUrl)}&cancel=${encodeURIComponent(params.cancelUrl)}&bookingId=${encodeURIComponent(params.bookingId)}&paymentId=${encodeURIComponent(params.metadata?.paymentId || "")}`
    const cancelUrl = `${appBase}/api/payments/paypal/return?cancelled=1&cancel=${encodeURIComponent(params.cancelUrl)}&bookingId=${encodeURIComponent(params.bookingId)}&paymentId=${encodeURIComponent(params.metadata?.paymentId || "")}`

    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: params.currency,
            value: (params.amount / 100).toFixed(2),
          },
          custom_id: JSON.stringify({ bookingId: params.bookingId, paymentId: params.metadata?.paymentId }),
          description: params.description,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "PAY_NOW",
      },
    }

    const resp = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const t = await resp.text()
      throw new Error(`PayPal order create failed ${resp.status}: ${t}`)
    }
    const data = (await resp.json()) as { id: string; links?: Array<{ rel: string; href: string }> }
    const orderId = data.id
    const approve = data.links?.find((l) => l.rel === "approve")?.href
    if (!orderId || !approve) throw new Error("PayPal response missing order id or approve link")
    return { url: approve, providerPaymentId: orderId }
  },

  async createRefund(_params: ProviderCreateRefundParams): Promise<ProviderCreateRefundResult> {
    // Implement on demand
    throw new Error("PayPal refunds not implemented")
  },
}


