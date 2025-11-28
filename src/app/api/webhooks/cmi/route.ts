import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation"

export async function POST(request: Request) {
    // CMI usually sends form-urlencoded data
    const contentType = request.headers.get("content-type") || ""
    let data: Record<string, string> = {}

    if (contentType.includes("application/json")) {
        data = (await request.json().catch(() => ({}))) as Record<string, string>
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await request.formData().catch(() => null)
        data = Object.fromEntries((form ? Array.from(form.entries()) : []) as [string, string][]) as Record<string, string>
    } else {
        // Fallback text parsing if needed
        data = {}
    }

    // CMI specific parameters
    // oid: Order ID (Payment ID)
    // Response: "Approved" or similar
    // Hash/Signature verification (TODO: Implement verification once spec is confirmed)

    const orderId = data["oid"]
    const status = data["Response"] // Example parameter, check CMI docs

    if (!orderId) {
        return NextResponse.json({ ok: false, error: "missing-oid" }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({ where: { id: orderId } })
    if (!payment) {
        return NextResponse.json({ ok: false, error: "payment-not-found" }, { status: 404 })
    }

    // Check success status
    // Common CMI success codes/messages
    const isSuccess = status === "Approved" || data["ProcReturnCode"] === "00"

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

    // CMI expects a specific response, often just "ACTION=POSTAUTH" or similar, or just 200 OK.
    // We'll return a standard JSON for now, or text if required.
    return NextResponse.json({ ok: true })
}
