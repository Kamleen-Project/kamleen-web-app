import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation"

async function resolvePaypalCredentials(): Promise<{ base: string; clientId: string; secret: string }> {
  const gateway = await prisma.paymentGateway.findUnique({ where: { key: "paypal" } })
  const cfg = (gateway?.config as null | { clientId?: string; clientSecret?: string }) || {}
  const clientId = (typeof cfg.clientId === "string" && cfg.clientId.length > 0) ? cfg.clientId : (process.env.PAYPAL_CLIENT_ID || null)
  const secret =
    (typeof cfg.clientSecret === "string" && cfg.clientSecret.length > 0 && !cfg.clientSecret.startsWith("env:"))
      ? cfg.clientSecret
      : (typeof cfg.clientSecret === "string" && cfg.clientSecret.startsWith("env:")
          ? process.env[cfg.clientSecret.slice(4)]
          : process.env.PAYPAL_CLIENT_SECRET)
  if (!clientId || !secret) throw new Error("Missing PayPal credentials (DB/env)")
  const testMode = gateway?.testMode ?? (process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.TEST_MODE === "true")
  const base = testMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"
  return { base, clientId, secret }
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

type Payload = {
  orderId?: unknown
  bookingId?: unknown
  paymentId?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Payload | null
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  const orderId = typeof body.orderId === "string" ? body.orderId : null
  const bookingIdFromQuery = typeof body.bookingId === "string" ? body.bookingId : null
  const paymentIdFromQuery = typeof body.paymentId === "string" ? body.paymentId : null
  if (!orderId) return NextResponse.json({ message: "Missing orderId" }, { status: 400 })

  try {
    const { base, clientId, secret } = await resolvePaypalCredentials()
    const token = await getAccessToken(base, clientId, secret)
    const resp = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!resp.ok) {
      await prisma.payment.updateMany({ where: { providerPaymentId: orderId }, data: { status: "CANCELLED" } })
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const data = (await resp.json()) as { purchase_units?: Array<{ custom_id?: string }>; id?: string }
    const custom = data.purchase_units?.[0]?.custom_id
    let bookingId: string | null = null
    let paymentId: string | null = null
    if (custom) {
      try {
        const parsed = JSON.parse(custom) as { bookingId?: string; paymentId?: string }
        bookingId = parsed.bookingId ?? null
        paymentId = parsed.paymentId ?? null
      } catch {}
    }
    if (!bookingId) bookingId = bookingIdFromQuery
    if (!paymentId) paymentId = paymentIdFromQuery

    if (paymentId) {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCEEDED", providerPaymentId: orderId, capturedAt: new Date() } })
    } else {
      await prisma.payment.updateMany({ where: { providerPaymentId: orderId }, data: { status: "SUCCEEDED", capturedAt: new Date() } })
    }

    if (!bookingId) {
      const payment = await prisma.payment.findFirst({ where: { providerPaymentId: orderId }, select: { bookingId: true } })
      bookingId = payment?.bookingId ?? null
    }

    if (bookingId) {
      await prisma.experienceBooking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED", paymentStatus: "SUCCEEDED", expiresAt: null },
      })
      // Run side effects (tickets, emails, etc.)
      await runBookingConfirmationSideEffects({ bookingId })
    }

    return NextResponse.json({ ok: true, bookingId: bookingId ?? null })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message || "Capture failed" }, { status: 500 })
  }
}


