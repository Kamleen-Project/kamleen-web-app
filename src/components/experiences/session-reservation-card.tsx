"use client";

import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { getSessionName, type SessionNameVariant } from "@/lib/session-name";

type Session = {
	id: string;
	startAt: string;
	duration?: string | null;
	capacity: number;
	priceOverride?: number | null;
	locationLabel?: string | null;
	meetingAddress?: string | null;
	availableSpots?: number;
};

type ExperienceMeta = {
	currency: string;
	basePrice: number;
	audience?: string | null;
	duration?: string | null;
	meetingAddress?: string | null;
	meetingCity?: string | null;
	location?: string | null;
};

export type SessionReservationCardVariant = SessionNameVariant;

export type SessionReservationCardProps = {
	session: Session;
	experience: ExperienceMeta;
	selected?: boolean;
	disabled?: boolean;
	variant?: SessionReservationCardVariant;
	onSelect?: (sessionId: string) => void;
};

function parseDurationToMinutes(label: string | null | undefined): number {
	if (!label) return 0;
	const lower = label.toLowerCase();
	let minutes = 0;
	const dayMatch = lower.match(/(\d+)\s*day/);
	const hourMatch = lower.match(/(\d+)\s*hour/);
	const minMatch = lower.match(/(\d+)\s*min/);
	if (dayMatch) minutes += (Number.parseInt(dayMatch[1], 10) || 0) * 24 * 60;
	if (hourMatch) minutes += (Number.parseInt(hourMatch[1], 10) || 0) * 60;
	if (minMatch) minutes += Number.parseInt(minMatch[1], 10) || 0;
	if (!dayMatch && !hourMatch && !minMatch) {
		const numeric = Number.parseInt(lower, 10);
		if (!Number.isNaN(numeric)) minutes += numeric;
	}
	return Math.max(0, minutes);
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function formatTime(value: string) {
	const date = new Date(value);
	return new Intl.DateTimeFormat("en", {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
}

function formatTimeRange(startIso: string, durationLabel: string | null | undefined, fallbackDurationLabel: string | null | undefined) {
	const start = new Date(startIso);
	const minutes = parseDurationToMinutes(durationLabel ?? fallbackDurationLabel ?? null);
	if (!minutes) {
		return formatTime(startIso);
	}
	const end = new Date(start.getTime() + minutes * 60 * 1000);
	const startStr = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
	const endStr = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(end);
	return `${startStr} to ${endStr}`;
}

function formatDateLabel(value: string) {
	const date = new Date(value);
	return new Intl.DateTimeFormat("en", {
		weekday: "long",
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function SessionReservationCard({ session, experience, selected, disabled, variant = "time", onSelect }: SessionReservationCardProps) {
	const available = session.availableSpots ?? session.capacity ?? 0;
	const isSoldOut = available <= 0;
	const pricePerSpot = session.priceOverride ?? experience.basePrice;

	const whenLabel = useMemo(() => {
		return getSessionName({
			startAt: session.startAt,
			durationLabel: session.duration ?? null,
			fallbackDurationLabel: experience.duration ?? null,
			variant,
		});
	}, [variant, session.startAt, session.duration, experience.duration]);

	const locationLabel = useMemo(() => {
		const top = session.meetingAddress ?? session.locationLabel ?? null;
		const city = experience.meetingCity ?? null;
		const fallbackTop = experience.meetingAddress ?? experience.location ?? null;
		const base = top ?? fallbackTop;
		if (!base) return null;
		return city ? `${base}, ${city}` : base;
	}, [session.meetingAddress, session.locationLabel, experience.meetingAddress, experience.location, experience.meetingCity]);

	return (
		<button
			type="button"
			disabled={disabled || isSoldOut}
			onClick={() => onSelect?.(session.id)}
			className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
				selected ? "border-primary bg-primary/10 text-foreground" : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border"
			} ${isSoldOut ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			<div className="flex flex-col gap-2 text-sm">
				<div className="flex items-start justify-between gap-3">
					<span className="font-medium text-foreground">{whenLabel}</span>
					<span
						className={`ml-auto whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
							isSoldOut ? "border-destructive/30 bg-background/50 text-destructive" : "border-border/50 bg-background/50 text-foreground"
						}`}
					>
						{isSoldOut ? "Sold out" : `${available} spots left`}
					</span>
				</div>
				<div className="flex items-center justify-between gap-3 text-xs">
					<div className="flex flex-wrap items-center gap-3 text-muted-foreground/80">
						{experience.audience && experience.audience.toLowerCase() !== "all" ? (
							<span className="rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] uppercase tracking-wider">{experience.audience}</span>
						) : null}
						{locationLabel ? (
							<span className="inline-flex items-center gap-1 text-muted-foreground">
								<MapPin className="size-3" /> {locationLabel}
							</span>
						) : null}
					</div>
					<span className="text-xs font-medium text-foreground">{formatCurrency(pricePerSpot, experience.currency)} / spot</span>
				</div>
			</div>
		</button>
	);
}

export default SessionReservationCard;
