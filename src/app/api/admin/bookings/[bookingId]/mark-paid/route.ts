import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runBookingConfirmationSideEffects } from "@/lib/booking-confirmation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

	const { bookingId } = await params;
    const booking = await prisma.experienceBooking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
    });

    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update booking and payment
    await prisma.experienceBooking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED", paymentStatus: "SUCCEEDED" },
    });

    if (booking.paymentId) {
        await prisma.payment.update({
            where: { id: booking.paymentId },
            data: { status: "SUCCEEDED", capturedAt: new Date() },
        });
    }

    // Run side effects (tickets, emails)
    await runBookingConfirmationSideEffects({ bookingId, origin: new URL(request.url).origin });

    return NextResponse.json({ ok: true });
}
