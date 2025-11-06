import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation"
import { verifyPayzoneSignature } from "@/lib/payments/providers/payzone"

export async function POST(request: Request) {
  // Support both form-encoded and JSON
  const contentType = request.headers.get("content-type") || ""
  let data: Record<string, string> = {}
  if (contentType.includes("application/json")) {
    data = (await request.json().catch(() => ({}))) as Record<string, string>
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData().catch(() => null)
    data = Object.fromEntries((form ? Array.from(form.entries()) : []) as [string, string][]) as Record<string, string>
  } else {
    const txt = await request.text().catch(() => "")
    try {
      data = JSON.parse(txt) as Record<string, string>
    } catch {
      data = {}
    }
  }

  const signature = (data["signature"] as string | undefined) ?? null
  if (!verifyPayzoneSignature(data, signature)) {
    return NextResponse.json({ ok: false, error: "invalid-signature" }, { status: 400 })
  }

  const orderId = data["orderId"] as string | undefined
  const status = (data["status"] as string | undefined)?.toUpperCase() || ""
  if (!orderId) return NextResponse.json({ ok: false, error: "missing-orderId" }, { status: 400 })

  // We use Payment.id (or metadata paymentId) as orderId when creating checkout
  const payment = await prisma.payment.findFirst({ where: { id: orderId } })
  if (!payment) return NextResponse.json({ ok: false, error: "payment-not-found" }, { status: 404 })

  const isSuccess = ["APPROVED", "SUCCESS", "SUCCEEDED"].includes(status)
  if (isSuccess) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } })
    await prisma.experienceBooking.update({
      where: { id: payment.bookingId },
      data: { status: "CONFIRMED", paymentStatus: "SUCCEEDED" },
    })
    await runBookingConfirmationSideEffects({ bookingId: payment.bookingId, origin: new URL(request.url).origin })
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } })
    await prisma.experienceBooking.update({ where: { id: payment.bookingId }, data: { paymentStatus: "CANCELLED" } })
  }

  return NextResponse.json({ ok: true })
}


