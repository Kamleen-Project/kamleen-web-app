"use client";

import { Badge } from "@/components/ui/badge";
import { SpotsBar } from "@/components/ui/spots-bar";
import { cn } from "@/lib/utils";
import { OrganizerBookingReservationCard } from "@/components/organizer/organizer-booking-reservation-card";

export type OrganizerBookingSession = {
	id: string;
	startAt: string;
	duration?: string | null;
	capacity: number;
	locationLabel?: string | null;
	meetingAddress?: string | null;
	reservedActive: number;
	reservedPending: number;
	bookings: Array<{
		id: string;
		status: "PENDING" | "CONFIRMED" | "CANCELLED";
		guests: number;
		totalPrice: number;
		createdAt: string;
		explorer: { name: string | null; email: string | null } | null;
	}>;
};

type OrganizerBookingSessionCardProps = {
	session: OrganizerBookingSession;
	experienceMeta: {
		duration?: string | null;
		meetingCity?: string | null;
		meetingAddress?: string | null;
		location?: string | null;
		currency?: string | undefined;
	};
	onUpdateStatus: (bookingId: string, nextStatus: "CONFIRMED" | "CANCELLED") => void;
	isActionLoading: boolean;
	pendingActionId: string | null;
};

export function OrganizerBookingSessionCard({ session, experienceMeta, onUpdateStatus, isActionLoading, pendingActionId }: OrganizerBookingSessionCardProps) {
	const total = session.capacity;
	const reservedAll = Math.min(session.reservedActive, total);
	const pending = Math.min(session.reservedPending, total);
	const confirmed = Math.max(0, Math.min(reservedAll - pending, total));
	const used = Math.min(confirmed + pending, total);
	const remaining = Math.max(0, total - used);

	return (
		<div className="rounded-xl border border-border/60 bg-background/70 p-4">
			<div className="mb-2 flex items-center justify-between gap-3 text-sm">
				<div className="text-foreground">
					{formatSessionTime(session.startAt, session.duration ?? null, experienceMeta.duration ?? null)}
					{(() => {
						const top = session.meetingAddress || session.locationLabel;
						const city = experienceMeta.meetingCity || null;
						if (top) {
							return <span className="text-muted-foreground"> · {city ? `${top}, ${city}` : top}</span>;
						}
						const fallbackTop = experienceMeta.meetingAddress || experienceMeta.location || null;
						return fallbackTop ? <span className="text-muted-foreground"> · {city ? `${fallbackTop}, ${city}` : fallbackTop}</span> : null;
					})()}
				</div>
				<div className="text-muted-foreground">
					{used}/{total} reserved · {remaining === 0 ? "sold out" : `${remaining} left`}
				</div>
			</div>
			<div className="mt-1">
				<SpotsBar value={confirmed} pending={pending} max={total} />
			</div>
			<ul className="mt-3 space-y-3">
				{session.bookings.map((b) => (
					<OrganizerBookingReservationCard
						key={b.id}
						reservation={b}
						currency={experienceMeta.currency || "USD"}
						pendingActionId={pendingActionId}
						isActionLoading={isActionLoading}
						onUpdateStatus={onUpdateStatus}
					/>
				))}
			</ul>
		</div>
	);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
	const statusStyles =
		status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700";
	return <Badge className={cn("text-xs", statusStyles)}>{status}</Badge>;
}

function parseDurationToMinutes(label: string | null | undefined): number {
	if (!label) return 0;
	const lower = label.toLowerCase();
	const hourMatch = /([0-9]+)\s*h/.exec(lower);
	const minMatch = /([0-9]+)\s*m/.exec(lower);
	const hours = hourMatch ? Number.parseInt(hourMatch[1] || "0", 10) : 0;
	const minutes = minMatch ? Number.parseInt(minMatch[1] || "0", 10) : 0;
	return hours * 60 + minutes;
}

function formatSessionTime(startIso: string, durationLabel: string | null, fallbackDurationLabel: string | null) {
	const start = new Date(startIso);
	const totalMinutes = parseDurationToMinutes(durationLabel ?? fallbackDurationLabel ?? null);
	const end = totalMinutes ? new Date(start.getTime() + totalMinutes * 60 * 1000) : null;
	const startStr = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
	const endStr = end ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(end) : "";
	return end ? `${startStr} to ${endStr}` : startStr;
}
