import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation"

async function resolvePaypalCredentials(): Promise<{ base: string; clientId: string; secret: string }> {
  // Prefer PaymentGateway config; fallback to env
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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get("token") // PayPal passes token as order ID
  const successUrl = url.searchParams.get("success")
  const cancelUrl = url.searchParams.get("cancel")
  const cancelledFlag = url.searchParams.get("cancelled")
  const bookingIdFromQuery = url.searchParams.get("bookingId")
  const paymentIdFromQuery = url.searchParams.get("paymentId")
  const origin = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0)
    ? process.env.NEXT_PUBLIC_APP_URL
    : `${url.protocol}//${url.host}`
  const fallbackSuccess = successUrl || `${origin}/dashboard/explorer/reservations?paid=1`
  const fallbackCancel = cancelUrl || `${origin}/dashboard/explorer/reservations?cancelled=1`
  if (!orderId) {
    // If user canceled on PayPal, we won't have a token. If booking/payment ids are present, mark as cancelled for consistency.
    if (cancelledFlag === "1" && bookingIdFromQuery && paymentIdFromQuery) {
      try {
        await prisma.payment.update({ where: { id: paymentIdFromQuery }, data: { status: "CANCELLED" } })
        await prisma.experienceBooking.update({ where: { id: bookingIdFromQuery }, data: { paymentStatus: "CANCELLED" } })
      } catch {}
    }
    return NextResponse.redirect(fallbackCancel)
  }

  try {
    const { base, clientId, secret } = await resolvePaypalCredentials()
    const token = await getAccessToken(base, clientId, secret)

    // Capture the order
    const resp = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!resp.ok) {
      // mark failure
      await prisma.payment.updateMany({ where: { providerPaymentId: orderId }, data: { status: "CANCELLED" } })
      return NextResponse.redirect(fallbackCancel)
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

    // Fallback to query params if custom_id was not present in capture response
    if (!bookingId) bookingId = bookingIdFromQuery
    if (!paymentId) paymentId = paymentIdFromQuery

    if (paymentId) {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCEEDED", providerPaymentId: orderId, capturedAt: new Date() } })
    } else {
      await prisma.payment.updateMany({ where: { providerPaymentId: orderId }, data: { status: "SUCCEEDED", capturedAt: new Date() } })
    }

    // If bookingId still missing, try resolve via payment record using providerPaymentId
    if (!bookingId) {
      const payment = await prisma.payment.findFirst({ where: { providerPaymentId: orderId }, select: { bookingId: true } })
      bookingId = payment?.bookingId ?? null
    }

    if (bookingId) {
      await prisma.experienceBooking.update({ where: { id: bookingId }, data: { status: "CONFIRMED", paymentStatus: "SUCCEEDED", expiresAt: null } })
      await runBookingConfirmationSideEffects({ bookingId, origin })
    }
  } catch {
    // ignore errors and continue redirect to cancel
    return NextResponse.redirect(fallbackCancel)
  }

  return NextResponse.redirect(fallbackSuccess)
}


