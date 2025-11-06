"use client";

import { OrganizerBookingSessionCard } from "@/components/organizer/organizer-booking-session-card";

export type OrganizerBookingExperience = {
	id: string;
	title: string;
	duration?: string | null;
	slug: string;
	currency?: string;
	meetingCity?: string | null;
	location?: string;
	meetingAddress?: string | null;
	sessions: Array<{
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
			paymentStatus?: "REQUIRES_PAYMENT_METHOD" | "REQUIRES_ACTION" | "PROCESSING" | "SUCCEEDED" | "CANCELLED" | "REFUNDED" | null;
			paymentMethod?: "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL" | null;
			guests: number;
			totalPrice: number;
			createdAt: string;
			explorer: { name: string | null; email: string | null } | null;
		}>;
	}>;
};

type OrganizerBookingExperienceCardProps = {
	experience: OrganizerBookingExperience;
	onUpdateStatus: (bookingId: string, nextStatus: "CONFIRMED" | "CANCELLED") => void;
	isActionLoading: boolean;
	pendingActionId: string | null;
};

export function OrganizerBookingExperienceCard({ experience, onUpdateStatus, isActionLoading, pendingActionId }: OrganizerBookingExperienceCardProps) {
	return (
		<div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-base font-semibold text-foreground">{experience.title}</p>
			</div>
			<div className="space-y-4">
				{(() => {
					const sessions = experience.sessions;
					if (!sessions.length) return null;
					const groups = sessions.reduce((acc, s) => {
						const key = getDateKeyLocal(s.startAt);
						(acc[key] ||= []).push(s);
						return acc;
					}, {} as Record<string, typeof sessions>);
					const orderedKeys = Object.keys(groups).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
					return orderedKeys.map((key) => (
						<div key={key} className="space-y-3">
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{formatDayHeaderLabelLocal(key)}</p>
							<div className="space-y-4">
								{groups[key].map((s) => (
									<OrganizerBookingSessionCard
										key={s.id}
										session={s}
										experienceMeta={{
											duration: experience.duration ?? null,
											meetingCity: experience.meetingCity ?? null,
											meetingAddress: experience.meetingAddress ?? null,
											location: experience.location ?? null,
											currency: experience.currency,
										}}
										onUpdateStatus={onUpdateStatus}
										isActionLoading={isActionLoading}
										pendingActionId={pendingActionId}
									/>
								))}
							</div>
						</div>
					));
				})()}
			</div>
		</div>
	);
}

function getDateKeyLocal(isoLike: string): string {
	const date = new Date(isoLike);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatDayHeaderLabelLocal(key: string): string {
	const [y, m, d] = key.split("-").map((p) => Number.parseInt(p, 10));
	const date = new Date(y, (m || 1) - 1, d || 1);
	return new Intl.DateTimeFormat("en", {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(date);
}
