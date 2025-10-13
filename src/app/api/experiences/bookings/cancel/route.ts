import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExperienceBookingStatus } from "@/generated/prisma";

type CancelBookingPayload = {
	bookingId?: unknown;
	guestMessage?: unknown;
};

const CANCELABLE_STATUSES: readonly ExperienceBookingStatus[] = ["PENDING"] as const;

export async function POST(request: Request) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return NextResponse.json({ message: "You must be signed in to cancel a booking." }, { status: 401 });
	}

	if (session.user.activeRole !== "EXPLORER") {
		return NextResponse.json({ message: "Only explorers can cancel bookings." }, { status: 403 });
	}

	let payload: CancelBookingPayload;
	try {
		payload = (await request.json()) as CancelBookingPayload;
	} catch {
		return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
	}

	const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;
	const guestMessage = typeof payload.guestMessage === "string" && payload.guestMessage.trim().length ? payload.guestMessage.trim() : null;

	if (!bookingId) {
		return NextResponse.json({ message: "Missing bookingId." }, { status: 400 });
	}

	const booking = await prisma.experienceBooking.findUnique({
		where: { id: bookingId },
		include: {
			experience: {
				select: {
					title: true,
					currency: true,
				},
			},
			session: true,
		},
	});

	if (!booking) {
		return NextResponse.json({ message: "Booking not found." }, { status: 404 });
	}

	if (booking.explorerId !== session.user.id) {
		return NextResponse.json({ message: "You can only cancel your own bookings." }, { status: 403 });
	}

	if (!CANCELABLE_STATUSES.includes(booking.status)) {
		return NextResponse.json({ message: "This booking can no longer be cancelled." }, { status: 409 });
	}

	const updatedBooking = await prisma.experienceBooking.update({
		where: { id: bookingId },
		data: {
			status: "CANCELLED",
			notes: guestMessage ?? booking.notes,
		},
		include: {
			experience: {
				select: {
					title: true,
					currency: true,
				},
			},
			session: true,
		},
	});

	return NextResponse.json({
		booking: {
			id: updatedBooking.id,
			status: updatedBooking.status,
			totalPrice: updatedBooking.totalPrice,
			guests: updatedBooking.guests,
			experienceId: updatedBooking.experienceId,
			experienceTitle: updatedBooking.experience.title,
			currency: updatedBooking.experience.currency,
			sessionId: updatedBooking.sessionId,
			sessionStartAt: updatedBooking.session.startAt,
		},
	});
}

