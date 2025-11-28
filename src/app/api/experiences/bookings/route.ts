import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { BOOKING_HOLD_MS } from "@/lib/bookings/hold-window";

// Only count confirmed bookings toward capacity; pending/payment-in-progress does not reserve
const ACTIVE_BOOKING_STATUSES = ["CONFIRMED"] as const;

type CreateBookingPayload = {
	experienceId?: unknown;
	sessionId?: unknown;
	guests?: unknown;
	notes?: unknown;
};

export async function POST(request: Request) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return NextResponse.json({ message: "You must be signed in to request a booking." }, { status: 401 });
	}

	if (session.user.activeRole !== "EXPLORER") {
		return NextResponse.json({ message: "Only explorers can request bookings." }, { status: 403 });
	}

	let payload: CreateBookingPayload;
	try {
		payload = (await request.json()) as CreateBookingPayload;
	} catch {
		return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
	}

	const experienceId = typeof payload.experienceId === "string" ? payload.experienceId : null;
	const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : null;
	const guests = Number.isInteger(payload.guests) ? (payload.guests as number) : Number.NaN;
	const notes = typeof payload.notes === "string" && payload.notes.trim().length ? payload.notes.trim() : null;

	if (!experienceId) {
		return NextResponse.json({ message: "Missing experienceId." }, { status: 400 });
	}

	if (!sessionId) {
		return NextResponse.json({ message: "Missing sessionId." }, { status: 400 });
	}

	if (!Number.isFinite(guests) || guests <= 0) {
		return NextResponse.json({ message: "Guests must be a positive integer." }, { status: 400 });
	}

	const sessionRecord = await prisma.experienceSession.findUnique({
		where: { id: sessionId },
		include: { experience: true },
	});

	if (!sessionRecord || sessionRecord.experienceId !== experienceId) {
		return NextResponse.json({ message: "Session not found for this experience." }, { status: 404 });
	}

	if (guests > sessionRecord.capacity) {
		return NextResponse.json({ message: "Guest count exceeds session capacity." }, { status: 400 });
	}

	const existingReservations = await prisma.experienceBooking.aggregate({
		where: {
			sessionId,
			status: { in: [...ACTIVE_BOOKING_STATUSES] },
		},
		_sum: { guests: true },
	});

	const reservedGuests = existingReservations._sum.guests ?? 0;
	if (reservedGuests + guests > sessionRecord.capacity) {
		return NextResponse.json({ message: "Not enough spots left for this session." }, { status: 409 });
	}

	const now = new Date();
	const existingPending = await prisma.experienceBooking.findFirst({
		where: {
			experienceId,
			explorerId: session.user.id,
			status: "PENDING",
			expiresAt: { gt: now },
		},
		select: {
			id: true,
			guests: true,
			sessionId: true,
			expiresAt: true,
		},
	});
	if (existingPending) {
		return NextResponse.json(
			{
				message: "You already have a pending reservation for this experience.",
				booking: {
					id: existingPending.id,
					status: "PENDING",
					guests: existingPending.guests,
					sessionId: existingPending.sessionId,
					experienceId,
					expiresAt: existingPending.expiresAt?.toISOString() ?? null,
				},
			},
			{ status: 409 }
		);
	}

	const pricePerGuest = sessionRecord.priceOverride ?? sessionRecord.experience.price;
	const totalPrice = pricePerGuest * guests;

	const booking = await prisma.experienceBooking.create({
		data: {
			experienceId,
			sessionId,
			explorerId: session.user.id,
			guests,
			totalPrice,
			status: "PENDING",
			expiresAt: new Date(Date.now() + BOOKING_HOLD_MS),
			notes,
		},
		include: {
			experience: { select: { title: true, currency: true } },
			session: true,
		},
	});

	// Notify organizer
	try {
		const experience = await prisma.experience.findUnique({ where: { id: experienceId }, select: { organizerId: true, title: true } });
		if (experience) {
			await createNotification({
				userId: experience.organizerId,
				title: "New reservation request",
				message: `You have a new booking request for ${experience.title}`,
				priority: "NORMAL",
				eventType: "BOOKING_CREATED",
				channels: ["TOAST", "EMAIL"],
				href: `/dashboard/organizer/bookings`,
				metadata: { bookingId: booking.id, experienceId },
			});
		}
	} catch (err) {
		console.error("[booking] failed to notify organizer", err);
	}

	return NextResponse.json({
		booking: {
			id: booking.id,
			status: booking.status,
			guests: booking.guests,
			totalPrice: booking.totalPrice,
			currency: booking.experience.currency,
			sessionId: booking.sessionId,
			experienceId: booking.experienceId,
			experienceTitle: booking.experience.title,
			sessionStartAt: booking.session.startAt,
			expiresAt: booking.expiresAt?.toISOString() ?? null,
		},
	});
}

