import { NextResponse } from "next/server"

import { handleStripeWebhook } from "@/lib/payments"
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get("stripe-signature")
  try {
    const res = await handleStripeWebhook({ payload: raw, header: signature })
    if (res.bookingId) {
      await runBookingConfirmationSideEffects({ bookingId: res.bookingId, origin: new URL(request.url).origin })
    }
    return new NextResponse("ok")
  } catch (e) {
    console.error("[stripe webhook] error", e)
    return new NextResponse("bad signature", { status: 400 })
  }
}


