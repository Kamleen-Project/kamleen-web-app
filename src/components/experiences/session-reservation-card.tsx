"use client";

import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { parseDurationToMinutes } from "@/lib/duration";

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

export type SessionReservationCardVariant = "full" | "preview";

export type SessionReservationCardProps = {
	session: Session;
	experience: ExperienceMeta;
	selected?: boolean;
	disabled?: boolean;
	variant?: SessionReservationCardVariant;
	onSelect?: (sessionId: string) => void;
};

import { formatCurrency } from "@/lib/format-currency";

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

// function formatDateLabel(value: string) {
// 	const date = new Date(value);
// 	return new Intl.DateTimeFormat("en", {
// 		weekday: "long",
// 		month: "short",
// 		day: "numeric",
// 		year: "numeric",
// 	}).format(date);
// }

function formatDateLabelNoYear(value: string) {
	const date = new Date(value);
	return new Intl.DateTimeFormat("en", {
		weekday: "long",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function SessionReservationCard({ session, experience, selected, disabled, variant = "preview", onSelect }: SessionReservationCardProps) {
	const available = session.availableSpots ?? session.capacity ?? 0;
	const isSoldOut = available <= 0;
	const pricePerSpot = session.priceOverride ?? experience.basePrice;

	const locationLabel = useMemo(() => {
		const top = session.meetingAddress ?? session.locationLabel ?? null;
		if (!top) return null;
		const city = experience.meetingCity ?? null;
		return city ? `${top}, ${city}` : top;
	}, [session.meetingAddress, session.locationLabel, experience.meetingCity]);

	return (
		<button
			type="button"
			disabled={disabled || isSoldOut}
			onClick={() => onSelect?.(session.id)}
			className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-brand border-2 border-l-5 bg-white text-foreground" : "border-border border-2 bg-white text-muted-foreground hover:border-border"
				} ${isSoldOut ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			<div className="flex flex-col gap-2 text-sm">
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col">
						{variant === "preview" && (
							<span className="font-medium text-foreground">{formatDateLabelNoYear(session.startAt)}</span>
						)}
						<span className={variant === "full" ? "font-medium text-foreground" : "text-muted-foreground"}>
							{formatTimeRange(session.startAt, session.duration, experience.duration)}
						</span>
					</div>
					<span
						className={`ml-auto whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${isSoldOut ? "border-destructive/30 bg-background/50 text-destructive" : "border-border/50 bg-background/50 text-foreground"
							}`}
					>
						{isSoldOut ? "Sold out" : `${available} spots left`}
					</span>
				</div>
				{variant === "full" && (
					<div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-border/40 mt-1">
						<div className="flex flex-wrap items-center gap-3 text-muted-foreground/80">
							{locationLabel ? (
								<span className="inline-flex items-center gap-1 text-muted-foreground">
									<MapPin className="size-3" /> {locationLabel}
								</span>
							) : null}
						</div>
						<span className="text-xs font-medium text-foreground">{formatCurrency(pricePerSpot, experience.currency)} / spot</span>
					</div>
				)}
			</div>
		</button>
	);
}

export default SessionReservationCard;
