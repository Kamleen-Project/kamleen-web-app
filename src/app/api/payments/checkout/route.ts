import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCheckoutForBooking } from "@/lib/payments"
import { BOOKING_HOLD_MS } from "@/lib/bookings/hold-window"
import type { PaymentProviderId } from "@/lib/payments/types"

type Payload = {
  bookingId?: unknown
  successUrl?: unknown
  cancelUrl?: unknown
  providerId?: unknown
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Payload | null
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })

  const bookingId = typeof body.bookingId === "string" ? body.bookingId : null
  const successUrl = typeof body.successUrl === "string" ? body.successUrl : null
  const cancelUrl = typeof body.cancelUrl === "string" ? body.cancelUrl : null
  const providerIdRaw = typeof body.providerId === "string" ? body.providerId.toLowerCase() : undefined
  const providerId: PaymentProviderId | undefined =
    providerIdRaw === "stripe" || providerIdRaw === "payzone" || providerIdRaw === "cash" || providerIdRaw === "cmi" || providerIdRaw === "paypal"
      ? (providerIdRaw as PaymentProviderId)
      : undefined
  if (!bookingId || !successUrl || !cancelUrl) {
    return NextResponse.json({ message: "bookingId, successUrl, and cancelUrl are required" }, { status: 400 })
  }

  const booking = await prisma.experienceBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, explorerId: true, status: true, expiresAt: true },
  })
  if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 })
  if (booking.explorerId !== session.user.id) {
    return NextResponse.json({ message: "You do not have access to this booking" }, { status: 403 })
  }

  const nextExpiresAt = booking.expiresAt ?? new Date(Date.now() + BOOKING_HOLD_MS)
  await prisma.experienceBooking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "REQUIRES_PAYMENT_METHOD",
      ...(booking.expiresAt ? {} : { expiresAt: nextExpiresAt }),
    },
  })

  try {
    const { url, paymentId, providerPaymentId } = await createCheckoutForBooking({ bookingId, successUrl, cancelUrl, providerId })
    return NextResponse.json({ url, paymentId, providerPaymentId: providerPaymentId ?? null })
  } catch (e) {
    const message = (e && typeof e === "object" && "message" in e) ? String((e as Error).message) : "Failed to start checkout"
    return NextResponse.json({ message }, { status: 400 })
  }
}


