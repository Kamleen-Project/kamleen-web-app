"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { TimeField } from "@/components/ui/time-field";
import { Stepper } from "@/components/ui/stepper";
import { PriceInput } from "@/components/ui/price-input";
import { ToggleField } from "@/components/ui/toggle-field";
import { DurationSelector } from "@/components/ui/duration-selector";
import { MapLatLng } from "@/components/ui/map-latlng";
import { FormField, FormLabel, FormControl, FormTextarea, FormInput } from "@/components/ui/form";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { CtaButton } from "@/components/ui/cta-button";
import { Clock, MapPin, Trash, ChevronDown, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { getDatePart, getTimePart } from "@/lib/datetime";
import type { SessionItem, WizardState } from "@/types/experience-wizard";

export type StepSessionsProps = {
	state: WizardState;
	sessions: SessionItem[];
	onRemove: (id: string) => void;
	onUpdateField: (
		id: string,
		key:
			| "startAt"
			| "capacity"
			| "priceOverride"
			| "meetingAddress"
			| "meetingLatitude"
			| "meetingLongitude"
			| "durationDays"
			| "durationHours"
			| "durationMinutes",
		value: string
	) => void;
	onUpdateSession: (id: string, patch: Partial<SessionItem>) => void;
	onAddSessionAt: (date: Date) => void;
	displayCurrency: string;
	maxSessions: number;
};

function getEffectiveDuration(state: WizardState, session?: SessionItem) {
	const useDifferent = Boolean(session?.useDifferentDuration);
	const dDays = useDifferent ? Number.parseInt(session?.durationDays || "0", 10) || 0 : Number.parseInt(state.durationDays || "0", 10) || 0;
	const dHours = useDifferent ? Number.parseInt(session?.durationHours || "0", 10) || 0 : Number.parseInt(state.durationHours || "0", 10) || 0;
	const dMinutes = useDifferent ? Number.parseInt(session?.durationMinutes || "0", 10) || 0 : Number.parseInt(state.durationMinutes || "0", 10) || 0;
	return { dDays, dHours, dMinutes };
}

function getSessionEndDate(state: WizardState, session: SessionItem): Date {
	const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
	const time = getTimePart(session.startAt) || "09:00";
	const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
	const start = new Date(`${dateOnly}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
	const { dDays, dHours, dMinutes } = getEffectiveDuration(state, session);
	const ms = ((dDays * 24 + dHours) * 60 + dMinutes) * 60 * 1000;
	return new Date(start.getTime() + ms);
}

function getDurationLabel(state: WizardState, session: SessionItem): string {
	const { dDays, dHours, dMinutes } = getEffectiveDuration(state, session);
	const parts: string[] = [];
	if (dDays) parts.push(`${String(dDays).padStart(2, "0")}d`);
	if (dHours) parts.push(`${String(dHours).padStart(2, "0")}h`);
	parts.push(`${String(dMinutes).padStart(2, "0")}m`);
	return parts.join(" ");
}

function getSessionLocationLabel(state: WizardState, session: SessionItem): string {
	const baseAddress = session.useDifferentLocation && session.meetingAddress.trim() ? session.meetingAddress.trim() : (state.meeting.address || "").trim();
	const baseCity = (state.meeting.city || "").trim();
	return [baseAddress, baseCity].filter(Boolean).join(", ");
}

function getSessionDateParts(session: SessionItem): { weekdayShort: string; dayOfMonth: string; monthShort: string } {
	let weekdayShort = "";
	let dayOfMonth = "";
	let monthShort = "";
	try {
		const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
		const date = new Date(dateOnly as string);
		weekdayShort = format(date, "EEE");
		dayOfMonth = format(date, "d");
		monthShort = format(date, "LLL");
	} catch {
		// ignore
	}
	return { weekdayShort, dayOfMonth, monthShort };
}

function getTimeRangeLabel(state: WizardState, session: SessionItem): string {
	const baseDate = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
	const startTime = getTimePart(session.startAt) || "09:00";
	const [startH, startM] = startTime.split(":").map((p) => Number.parseInt(p || "0", 10));
	const start = new Date(`${baseDate}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`);
	const end = getSessionEndDate(state, session);
	return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
}

function SessionSummary({
	state,
	session,
	expanded,
	displayCurrency,
}: {
	state: WizardState;
	session: SessionItem;
	expanded: boolean;
	displayCurrency: string;
}) {
	const capacityNum = session.capacity ? Number.parseInt(session.capacity, 10) : 0;
	// const capacityLabel = capacityNum ? `${capacityNum} spot${capacityNum === 1 ? "" : "s"}` : "";
	const effective = session.useDifferentPrice && session.priceOverride ? session.priceOverride : state.price;
	const priceText = effective ? `${effective} ${displayCurrency} / spot` : "";
	const reserved = Math.max(0, Number.parseInt(String(session.reservedGuests ?? 0), 10) || 0);
	const durationLabel = getDurationLabel(state, session);
	const locationLabel = getSessionLocationLabel(state, session);
	const { weekdayShort, dayOfMonth, monthShort } = getSessionDateParts(session);
	const timeRange = getTimeRangeLabel(state, session);
	return (
		<div className="flex items-center gap-4">
			<div className="flex w-16 flex-col items-center justify-center py-1">
				<span className="text-xs font-semibold text-primary leading-none">{weekdayShort}</span>
				<span className="text-3xl font-semibold text-foreground leading-tight">{dayOfMonth}</span>
				<span className="text-xs text-muted-foreground leading-none">{monthShort}</span>
			</div>
			<div className="hidden h-12 w-px self-stretch bg-border/60 sm:block" />
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<Clock className="size-4 text-muted-foreground" />
					<span className="font-medium text-foreground">{timeRange}</span>
				</div>
				{locationLabel ? (
					<div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
						<MapPin className="size-4" />
						<span className="truncate">{locationLabel}</span>
					</div>
				) : null}
				{!expanded ? (
					<div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
						<span className="text-muted-foreground">Duration</span>
						<span className="font-semibold text-foreground">{durationLabel}</span>
						<span className="h-3 w-px bg-border/70" aria-hidden />
						<span className="text-muted-foreground">Price</span>
						<span className="font-semibold text-foreground">{priceText || "—"}</span>
						<span className="h-3 w-px bg-border/70" aria-hidden />
						<span className="text-muted-foreground">Spots</span>
						<span className="font-semibold text-foreground">
							{capacityNum ? `${capacityNum}` : "—"}
							{reserved ? ` (${reserved} reserved)` : ""}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

export default function StepSessions({
	state,
	sessions,
	onRemove,
	onUpdateField,
	onUpdateSession,
	onAddSessionAt,
	displayCurrency,
	maxSessions,
}: StepSessionsProps) {
	const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

	const sessionsSorted = useMemo(() => {
		return [...sessions].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
	}, [sessions]);

	// Sync expanded map with current sessions list
	useEffect(() => {
		setExpandedById((prev) => {
			const next: Record<string, boolean> = { ...prev };
			let changed = false;
			const ids = new Set(sessions.map((s) => s.id));
			for (const s of sessions) {
				if (!(s.id in next)) {
					next[s.id] = false;
					changed = true;
				}
			}
			for (const id of Object.keys(next)) {
				if (!ids.has(id)) {
					delete next[id];
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [sessions]);

	function toggleExpanded(id: string) {
		setExpandedById((prev) => ({ ...prev, [id]: !prev[id] }));
	}

	function toggleDifferentLocation(session: SessionItem) {
		const next = !Boolean(session.useDifferentLocation);
		const shouldInit = next && (!session.meetingLatitude || !session.meetingLatitude.trim() || !session.meetingLongitude || !session.meetingLongitude.trim());
		const patch: Partial<SessionItem> = { useDifferentLocation: next };
		if (shouldInit) {
			patch.meetingLatitude = state.meeting.latitude;
			patch.meetingLongitude = state.meeting.longitude;
		}
		onUpdateSession(session.id, patch);
	}

	function toggleDifferentPrice(session: SessionItem) {
		const next = !Boolean(session.useDifferentPrice);
		const patch: Partial<SessionItem> = {
			useDifferentPrice: next,
			priceOverride: next ? session.priceOverride : "",
		};
		onUpdateSession(session.id, patch);
	}

	function toggleDifferentDuration(session: SessionItem) {
		const next = !Boolean(session.useDifferentDuration);
		const patch: Partial<SessionItem> = {
			useDifferentDuration: next,
		};
		if (next) {
			patch.durationDays = session.durationDays ?? state.durationDays;
			patch.durationHours = session.durationHours ?? state.durationHours;
			patch.durationMinutes = session.durationMinutes ?? state.durationMinutes;
		}
		onUpdateSession(session.id, patch);
	}

	return (
		<div className="relative space-y-4 lg:pl-16">
			<div className="absolute left-17 -mt-12 border-l-2 border-border/70 top-0 bottom-0 hidden lg:block" />
			<div className="mb-2 ml-6 flex items-center justify-center text-sm font-bold text-muted-foreground sticky top-[-24px] z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
				<span>
					{sessions.length} / {maxSessions} sessions
				</span>
			</div>
			{sessionsSorted.map((session, index) => (
				<div key={session.id} id={`session-${session.id}`} className="grid grid-cols-[12px_1fr] items-stretch gap-4">
					<div className="relative hidden lg:block">
						<div className="absolute left-full mt-8 h-3 w-3 -translate-x-1/1 rounded-full bg-primary" />
						{(index === 0 ||
							new Date(sessionsSorted[index - 1].startAt).getMonth() !== new Date(session.startAt).getMonth() ||
							new Date(sessionsSorted[index - 1].startAt).getFullYear() !== new Date(session.startAt).getFullYear()) && (
								<div className="pointer-events-none absolute right_full top-6 z-10 mr-3 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
									{(() => {
										try {
											const dateOnly = getDatePart(session.startAt) || session.startAt.split("T")[0];
											return format(new Date(dateOnly as string), "LLL");
										} catch {
											return "";
										}
									})()}
								</div>
							)}
					</div>
					<Card className="relative border-border/60 bg-card/80 shadow-sm">
						<CardHeader className="flex flex-col mb-0 gap-2 sm:flex-row sm:items-center sm:justify-between">
							<button
								type="button"
								className="text-left"
								onClick={() => toggleExpanded(session.id)}
								aria-expanded={expandedById[session.id] ? "true" : "false"}
							>
								<SessionSummary state={state} session={session} expanded={!!expandedById[session.id]} displayCurrency={displayCurrency} />
							</button>
							<div className="flex items-center gap-2">
								<CtaIconButton
									color="whiteBorder"
									size="md"
									type="button"
									onClick={() => toggleExpanded(session.id)}
									aria-label={expandedById[session.id] ? "Collapse" : "Expand"}
								>
									{expandedById[session.id] ? <ChevronDown /> : <ChevronRight />}
								</CtaIconButton>
								{sessions.length > 1 ? (
									<CtaIconButton
										type="button"
										color="whiteBorder"
										size="md"
										onClick={() => onRemove(session.id)}
										disabled={Number.parseInt(String(session.reservedGuests ?? 0), 10) > 0}
										ariaLabel={Number.parseInt(String(session.reservedGuests ?? 0), 10) > 0 ? "Cannot remove a session with reservations" : undefined}
										aria-label="Remove session"
									>
										<Trash className="h-4 w-4" />
									</CtaIconButton>
								) : null}
							</div>
						</CardHeader>
						{expandedById[session.id] ? (
							<CardContent className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-3">
									<div className="space-y-3">
										<DateField
											label="Start date"
											value={getDatePart(session.startAt) ? new Date(getDatePart(session.startAt) as string) : undefined}
											minDate={(() => {
												const d = new Date();
												d.setDate(d.getDate() + 1);
												d.setHours(0, 0, 0, 0);
												return d;
											})()}
											onChange={(date) => {
												if (date) {
													const dateOnly = format(date, "yyyy-MM-dd");
													const time = getTimePart(session.startAt) || "09:00";
													onUpdateField(session.id, "startAt", `${dateOnly}T${time}`);
												}
											}}
										/>
									</div>
									<div className="space-y-3">
										<TimeField
											label="Start time"
											value={getTimePart(session.startAt) || "09:00"}
											onChange={(t) => {
												const dateOnly = getDatePart(session.startAt) || format(new Date(), "yyyy-MM-dd");
												onUpdateField(session.id, "startAt", `${dateOnly}T${t}`);
											}}
											minuteStep={5}
										/>
									</div>
									<div className="space-y-3">
										<FormField>
											<FormLabel>Capacity</FormLabel>
											<FormControl>
												<Stepper
													value={session.capacity}
													onChange={(val) => onUpdateField(session.id, "capacity", val)}
													min={Math.max(0, Number.parseInt(String(session.reservedGuests ?? 0), 10) || 0)}
													max={100}
												/>
											</FormControl>
										</FormField>
									</div>
								</div>
								<div className="grid gap-4">
									<ToggleField
										label="Use different price for this session"
										checked={Boolean(session.useDifferentPrice)}
										onChange={() => toggleDifferentPrice(session)}
									/>
									{session.useDifferentPrice ? (
										<PriceInput
											label={"Price override"}
											value={session.priceOverride}
											onValueChange={(next) => onUpdateField(session.id, "priceOverride", next)}
											currency={displayCurrency}
											placeholder="Matches base price"
										/>
									) : null}
									<ToggleField
										label="Use different duration for this session"
										checked={Boolean(session.useDifferentDuration)}
										onChange={() => toggleDifferentDuration(session)}
									/>
									{session.useDifferentDuration ? (
										<DurationSelector
											label={"Session duration"}
											value={{ days: session.durationDays ?? "0", hours: session.durationHours ?? "0", minutes: session.durationMinutes ?? "0" }}
											onChange={(next) => {
												onUpdateField(session.id, "durationDays", next.days);
												onUpdateField(session.id, "durationHours", next.hours);
												onUpdateField(session.id, "durationMinutes", next.minutes);
											}}
											daysEnabled
											hoursEnabled
											minutesEnabled
											maxDays={7}
											maxHours={23}
											minuteStep={5}
										/>
									) : null}
									<ToggleField
										label="Use different location for this session"
										checked={Boolean(session.useDifferentLocation)}
										onChange={() => toggleDifferentLocation(session)}
									/>
								</div>
								{session.useDifferentLocation ? (
									<>
										<div className="grid gap-4 grid-cols-3">
											<div className="space-y-3">
												<FormField>
													<FormLabel>Session address</FormLabel>
													<FormControl>
														<FormTextarea
															value={session.meetingAddress}
															onChange={(event) => onUpdateField(session.id, "meetingAddress", event.target.value)}
															placeholder="Street and number"
														/>
													</FormControl>
												</FormField>
												<FormField>
													<FormLabel>City</FormLabel>
													<FormControl>
														<FormInput value={state.meeting.city} disabled />
													</FormControl>
												</FormField>
											</div>
											<div className="space-y-3 col-span-2">
												<MapLatLng
													lat={session.meetingLatitude ?? ""}
													lng={session.meetingLongitude ?? ""}
													onLatChange={(value) => onUpdateField(session.id, "meetingLatitude", value)}
													onLngChange={(value) => onUpdateField(session.id, "meetingLongitude", value)}
													onMapChange={(lat, lng) => {
														onUpdateField(session.id, "meetingLatitude", String(lat));
														onUpdateField(session.id, "meetingLongitude", String(lng));
													}}
													height={360}
													aspect="twoOne"
													hint="Optional per-session pin. Defaults to meeting point when empty."
												/>
											</div>
										</div>
									</>
								) : null}
							</CardContent>
						) : null}
					</Card>
				</div>
			))}
			<div className="flex flex-wrap gap-2 ml-12">
				<CtaButton
					color="whiteBorder"
					size="md"
					type="button"
					onClick={() => {
						const last = sessionsSorted[sessionsSorted.length - 1];
						const base = last ? new Date(getDatePart(last.startAt) as string) : new Date();
						base.setDate(base.getDate() + 1);
						const time = last ? getTimePart(last.startAt) || "09:00" : "09:00";
						const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
						base.setHours(h, m, 0, 0);
						onAddSessionAt(base);
					}}
				>
					Add next day (same time)
				</CtaButton>
				<CtaButton
					color="whiteBorder"
					size="md"
					type="button"
					onClick={() => {
						const last = sessionsSorted[sessionsSorted.length - 1];
						const base = last ? new Date(getDatePart(last.startAt) as string) : new Date();
						base.setDate(base.getDate() + 7);
						const time = last ? getTimePart(last.startAt) || "09:00" : "09:00";
						const [h, m] = time.split(":").map((p) => Number.parseInt(p || "0", 10));
						base.setHours(h, m, 0, 0);
						onAddSessionAt(base);
					}}
				>
					Add next week (same day/time)
				</CtaButton>
				<CtaButton
					color="whiteBorder"
					size="md"
					type="button"
					onClick={() => {
						const last = sessionsSorted[sessionsSorted.length - 1];
						const base = last ? getSessionEndDate(state, last) : new Date();
						base.setMinutes(base.getMinutes() + 60);
						onAddSessionAt(base);
					}}
				>
					Add next session
				</CtaButton>
			</div>
		</div>
	);
}
