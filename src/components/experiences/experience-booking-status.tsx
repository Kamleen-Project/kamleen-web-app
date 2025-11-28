"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { BookingStatusCard, type BookingItem } from "@/components/experiences/booking-status-card";

type ExperienceBookingStatusProps = {
	bookings: Array<{
		id: string;
		status: "PENDING" | "CONFIRMED" | "CANCELLED";
		guests: number;
		totalPrice: number;
		currency: string;
		createdAt: string;
		session: {
			id: string;
			startAt: string;
			duration: string | null;
			locationLabel: string | null;
		} | null;
	}>;
	experience?: {
		title?: string | null;
		audience?: string | null;
		duration?: string | null;
		location?: string | null;
		meetingAddress?: string | null;
		meetingCity?: string | null;
	} | null;
};

type CancelBookingPayload = {
	bookingId: string;
	guestMessage?: string;
};

import { formatCurrency } from "@/lib/format-currency";

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
		.format(new Date(value))
		.replace(",", "");
}

function getStatusMeta(status: "PENDING" | "CONFIRMED" | "CANCELLED") {
	switch (status) {
		case "CONFIRMED":
			return {
				label: "Confirmed",
				icon: <CheckCircle2 className="size-4 text-emerald-500" />,
				badgeClass: "bg-emerald-100 text-emerald-700",
			};
		case "CANCELLED":
			return {
				label: "Cancelled",
				icon: <XCircle className="size-4 text-destructive" />,
				badgeClass: "bg-destructive/10 text-destructive",
			};
		case "PENDING":
		default:
			return {
				label: "Pending confirmation",
				icon: <Clock3 className="size-4 text-amber-500" />,
				badgeClass: "bg-amber-100 text-amber-700",
			};
	}
}

export function ExperienceBookingStatus({ bookings, experience }: ExperienceBookingStatusProps) {
	const [items, setItems] = useState(bookings);
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		setItems(bookings);
	}, [bookings]);

	const activeBookings = useMemo(() => items.filter((booking) => booking.status !== "CANCELLED"), [items]);

	if (!activeBookings.length) {
		return null;
	}

	const handleCancel = (bookingId: string) => {
		setErrorMessage(null);
		setSuccessMessage(null);
		setPendingId(bookingId);
		startTransition(async () => {
			try {
				const response = await fetch("/api/experiences/bookings/cancel", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ bookingId } satisfies CancelBookingPayload),
				});

				if (!response.ok) {
					const data = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(data?.message ?? "We couldn't cancel this reservation. Please try again.");
				}

				setSuccessMessage("Reservation cancelled. We've updated the status here.");
				setItems((previous) => previous.map((booking) => (booking.id === bookingId ? { ...booking, status: "CANCELLED" } : booking)));
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : "Unknown error. Please retry.");
			} finally {
				setPendingId(null);
			}
		});
	};

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your reservation</p>
				<h2 className="text-xl font-semibold text-foreground">Current booking status</h2>
			</div>

			{errorMessage ? <p className="text-sm font-medium text-destructive">{errorMessage}</p> : null}
			{successMessage ? <p className="text-sm font-medium text-emerald-600">{successMessage}</p> : null}

			<div className="space-y-6">
				{activeBookings.map((booking) => (
					<BookingStatusCard
						key={booking.id}
						booking={booking as BookingItem}
						pending={pending}
						pendingId={pendingId}
						onCancel={handleCancel}
						experienceMeta={experience ?? null}
					/>
				))}
			</div>
		</div>
	);
}
