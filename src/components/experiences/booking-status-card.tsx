"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Info, Loader2, X, XCircle } from "lucide-react";
import { getSessionDateLabel, getSessionTimeRange } from "@/lib/session-name";
import CtaIconButton from "../ui/cta-icon-button";
import CtaButton from "../ui/cta-button";

export type BookingStatusValue = "PENDING" | "CONFIRMED" | "CANCELLED";

export type BookingItem = {
	id: string;
	status: BookingStatusValue;
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
};

export type BookingStatusCardProps = {
	booking: BookingItem;
	pending?: boolean;
	pendingId?: string | null;
	onCancel?: (bookingId: string) => void;
	experienceMeta?: {
		title?: string | null;
		audience?: string | null;
		duration?: string | null;
		location?: string | null;
		meetingAddress?: string | null;
		meetingCity?: string | null;
	} | null;
};

import { formatCurrency } from "@/lib/format-currency";

function getStatusMeta(status: BookingStatusValue) {
	switch (status) {
		case "CONFIRMED":
			return { label: "Confirmed", icon: <CheckCircle2 className="size-4 text-emerald-500" />, badgeClass: "bg-emerald-100 text-emerald-700" };
		case "CANCELLED":
			return { label: "Cancelled", icon: <XCircle className="size-4 text-destructive" />, badgeClass: "bg-destructive/10 text-destructive" };
		case "PENDING":
		default:
			return { label: "Pending confirmation", icon: <Clock3 className="size-4 text-amber-500" />, badgeClass: "bg-amber-100 text-amber-700" };
	}
}

export function BookingStatusCard({ booking, pending = false, pendingId = null, onCancel }: BookingStatusCardProps) {
	const statusMeta = getStatusMeta(booking.status);
	const isCancelling = pending && pendingId === booking.id;
	const sessionDateLabel = booking.session ? getSessionDateLabel(booking.session.startAt) : null;
	const sessionTimeRange = booking.session
		? getSessionTimeRange({ startAt: booking.session.startAt, durationLabel: booking.session.duration, fallbackDurationLabel: null })
		: null;

	// Countdown / time-left
	const [now, setNow] = useState<Date>(() => new Date());
	const startAtDate = useMemo(() => (booking.session?.startAt ? new Date(booking.session.startAt) : null), [booking.session?.startAt]);
	const msLeft = useMemo(() => (startAtDate ? startAtDate.getTime() - now.getTime() : null), [startAtDate, now]);
	const timeLeftLabel = useMemo(() => {
		if (msLeft == null) return null;
		if (msLeft <= 0) return "Started";
		const totalSeconds = Math.floor(msLeft / 1000);
		const totalHours = Math.floor(totalSeconds / 3600);
		if (totalHours >= 24) {
			const days = Math.floor(totalHours / 24);
			return `${days} day${days === 1 ? "" : "s"} left`;
		}
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} left`;
	}, [msLeft]);

	useEffect(() => {
		if (!startAtDate) return;
		// Update every second only when under 24h for smooth countdown, else every minute
		const updateIntervalMs = () => {
			const diff = startAtDate.getTime() - Date.now();
			const hours = Math.floor(Math.max(0, diff) / 3600000);
			return hours >= 24 ? 60_000 : 1_000;
		};
		let interval = setInterval(() => setNow(new Date()), updateIntervalMs());
		// Re-evaluate frequency roughly every 10 minutes in case threshold crosses
		const recalibrate = setInterval(() => {
			clearInterval(interval);
			interval = setInterval(() => setNow(new Date()), updateIntervalMs());
		}, 600_000);
		return () => {
			clearInterval(interval);
			clearInterval(recalibrate);
		};
	}, [startAtDate]);

	// Info modal
	const [openInfo, setOpenInfo] = useState(false);
	const closeInfo = () => setOpenInfo(false);

	return (
		// <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/30 shadow-sm">
		<div>
			<div className="drop-shadow-sm">
				<div
					className="flex flex-col relative p-4 rounded-lg shadow bg-white dark:bg-neutral-800"
					style={{
						WebkitMaskImage: "radial-gradient(circle at 12px 92px, transparent 12px, red 12.5px)",
						WebkitMaskPosition: "-12px",
					}}
				>
					<div className="flex gap-3 justify-between items-center pb-2">
						<div className="text-left">
							{booking.session ? (
								<div>
									<h3 className="text-lg font-semibold text-foreground">{sessionDateLabel}</h3>
									<h4 className="text-sm text-muted-foreground">{sessionTimeRange}</h4>
									{booking.session.locationLabel ? ` · ${booking.session.locationLabel}` : ""}
								</div>
							) : null}
						</div>
						<div className="text-right">{timeLeftLabel && booking.session ? <span className="text-xs text-muted-foreground">{timeLeftLabel}</span> : null}</div>
					</div>
					<div className="mt-4 mb-2 border border-dashed border-neutral-200 dark:border-neutral-700"></div>
					<div className="pt-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-sm font-medium text-foreground">
								{statusMeta.icon}
								{statusMeta.label}
							</div>
						</div>
						<div className="mt-3 space-y-2 text-sm text-muted-foreground">
							<div className="flex items-center justify-between">
								<p className="font-medium text-foreground">{formatCurrency(booking.totalPrice, booking.currency)}</p>
								<div className="flex items-center gap-2">
									<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.badgeClass}`}>
										{booking.guests} guest{booking.guests === 1 ? "" : "s"}
									</span>
									<CtaIconButton color="whiteBorder" size="md" ariaLabel="View reservation details" onClick={() => setOpenInfo(true)}>
										<Info className="size-4" />
									</CtaIconButton>
								</div>
							</div>

							{booking.status === "PENDING" && onCancel ? (
								<CtaButton color="whiteBorder" size="sm" type="button" disabled={isCancelling} onClick={() => onCancel(booking.id)} className="mt-2">
									{isCancelling ? (
										<span className="inline-flex items-center gap-2">
											<Loader2 className="size-4 animate-spin" /> Cancelling…
										</span>
									) : (
										"Cancel reservation"
									)}
								</CtaButton>
							) : null}
						</div>
					</div>
				</div>
			</div>
			{/* Info Modal */}
			{openInfo ? (
				<div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" onClick={closeInfo}>
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative w-full max-w-lg max-h-[85vh] overflow-auto rounded-3xl border border-border/60 bg-background text-foreground shadow-2xl"
					>
						<CtaIconButton color="whiteBorder" size="md" ariaLabel="Close details" onClick={closeInfo}>
							<X className="size-4" />
						</CtaIconButton>
						<div className="p-6 space-y-4">
							<div className="space-y-1 pr-10">
								<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Reservation details</p>
								<h3 className="text-lg font-semibold text-foreground">{booking.session ? "Session & booking" : "Booking"}</h3>
							</div>
							<div className="space-y-3 text-sm">
								<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
									<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Experience</p>
									<div className="mt-1 text-foreground">
										{sessionDateLabel ? <p className="font-medium">{sessionDateLabel}</p> : null}
										{sessionTimeRange ? <p className="text-muted-foreground">{sessionTimeRange}</p> : null}
										{booking.session?.locationLabel ? <p className="text-muted-foreground">{booking.session.locationLabel}</p> : null}
									</div>
								</div>
								<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
									<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reservation</p>
									<div className="mt-1 grid grid-cols-2 gap-3 text-foreground">
										<div>
											<p className="text-muted-foreground text-xs">Guests</p>
											<p className="font-medium">{booking.guests}</p>
										</div>
										<div>
											<p className="text-muted-foreground text-xs">Total</p>
											<p className="font-medium">{formatCurrency(booking.totalPrice, booking.currency)}</p>
										</div>
										{booking.status ? (
											<div>
												<p className="text-muted-foreground text-xs">Status</p>
												<p className="font-medium inline-flex items-center gap-2">
													{statusMeta.icon}
													{statusMeta.label}
												</p>
											</div>
										) : null}
										{timeLeftLabel && booking.session ? (
											<div>
												<p className="text-muted-foreground text-xs">Time left</p>
												<p className="font-medium">{timeLeftLabel}</p>
											</div>
										) : null}
									</div>
								</div>
								{booking.session ? (
									<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
										<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session</p>
										<div className="mt-1 space-y-1 text-foreground">
											{sessionDateLabel ? <p className="font-medium">{sessionDateLabel}</p> : null}
											{sessionTimeRange ? <p className="text-muted-foreground">{sessionTimeRange}</p> : null}
											{booking.session.locationLabel ? <p className="text-muted-foreground">{booking.session.locationLabel}</p> : null}
										</div>
									</div>
								) : null}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export default BookingStatusCard;
