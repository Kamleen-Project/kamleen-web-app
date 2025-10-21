"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Star, X } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";

import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { SessionReservationCard } from "@/components/experiences/session-reservation-card";

const overlayStyle: CSSProperties = { backdropFilter: "blur(6px)" };

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
type ButtonSize = VariantProps<typeof buttonVariants>["size"];

type ExperienceReservationModalProps = {
	experience: {
		id: string;
		title: string;
		currency: string;
		price: number;
		location?: string | null;
		audience?: string | null;
		duration?: string | null;
		heroImage?: string | null;
		averageRating?: number | null;
		reviewCount?: number | null;
		meetingAddress?: string | null;
		meetingCity?: string | null;
	};
	sessions: Array<{
		id: string;
		startAt: string;
		duration?: string | null;
		capacity: number;
		priceOverride?: number | null;
		locationLabel?: string | null;
		meetingAddress?: string | null;
		availableSpots?: number;
	}>;
	buttonLabel?: string;
	buttonVariant?: ButtonVariant;
	buttonSize?: ButtonSize;
	buttonClassName?: string;
	buttonId?: string;
};

type Step = "select-session" | "review" | "complete";

type ApiState = { status: "idle" } | { status: "submitting" } | { status: "success"; bookingReference: string } | { status: "error"; message: string };

// removed unused formatDateTime helper

function formatTime(value: string) {
	const date = new Date(value);
	return new Intl.DateTimeFormat("en", {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
}

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
	// Fallback for pure number labels like "90"
	if (!dayMatch && !hourMatch && !minMatch) {
		const numeric = Number.parseInt(lower, 10);
		if (!Number.isNaN(numeric)) minutes += numeric;
	}
	return Math.max(0, minutes);
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

function formatDateWithRange(startIso: string, durationLabel: string | null | undefined, fallbackDurationLabel: string | null | undefined) {
	const dateLabel = formatDateLabel(startIso);
	const range = formatTimeRange(startIso, durationLabel, fallbackDurationLabel);
	return `${dateLabel} • ${range}`;
}

function getDateKeyLocal(isoLike: string): string {
	// Normalizes a datetime string into a local calendar date key: yyyy-mm-dd
	const date = new Date(isoLike);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function startOfDayLocal(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayHeaderLabelLocal(key: string): string {
	// key is yyyy-mm-dd
	const [y, m, d] = key.split("-").map((p) => Number.parseInt(p, 10));
	const date = new Date(y, (m || 1) - 1, d || 1);
	const today = startOfDayLocal(new Date());
	const tomorrow = new Date(today.getTime());
	tomorrow.setDate(today.getDate() + 1);
	const target = startOfDayLocal(date);

	const isSame = (a: Date, b: Date) => a.getTime() === b.getTime();
	if (isSame(target, today)) {
		const monthDay = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(target);
		return `Today, ${monthDay}`;
	}
	if (isSame(target, tomorrow)) {
		const monthDay = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(target);
		return `Tomorrow, ${monthDay}`;
	}
	const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(target);
	const monthDay = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(target);
	return `${weekday}, ${monthDay}`;
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function ExperienceReservationModal({
	experience,
	sessions,
	buttonLabel = "Reserve a spot",
	buttonVariant,
	buttonSize,
	buttonClassName,
	buttonId,
}: ExperienceReservationModalProps) {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<Step>("select-session");
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
	const [guestCount, setGuestCount] = useState(1);
	const [apiState, setApiState] = useState<ApiState>({ status: "idle" });

	const sessionLookup = useMemo(() => {
		return new Map(sessions.map((session) => [session.id, session]));
	}, [sessions]);

	const selectedSession = selectedSessionId ? sessionLookup.get(selectedSessionId) ?? null : null;

	const basePrice = experience.price;
	const pricePerGuest = selectedSession?.priceOverride ?? basePrice;
	const totalPrice = pricePerGuest * guestCount;
	const hasSessions = sessions.length > 0;

	// Compute the maximum reservable spots for the selected session
	const maxReservableSpots = selectedSession ? selectedSession.availableSpots ?? selectedSession.capacity ?? 99 : 99;

	const openModal = useCallback(() => {
		if (!hasSessions) {
			return;
		}
		setStep("select-session");
		setSelectedSessionId(null);
		setGuestCount(1);
		setApiState({ status: "idle" });
		setOpen(true);
	}, [hasSessions]);

	const closeModal = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeModal();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.classList.add("overflow-hidden");

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [closeModal, open]);

	// Allow opening via a global custom event for external triggers (e.g., sticky header)
	useEffect(() => {
		const handleExternalOpen = () => {
			if (!hasSessions) return;
			setStep("select-session");
			setSelectedSessionId(null);
			setGuestCount(1);
			setApiState({ status: "idle" });
			setOpen(true);
		};
		const listener: EventListener = () => handleExternalOpen();
		window.addEventListener("open-experience-reservation", listener);
		return () => window.removeEventListener("open-experience-reservation", listener);
	}, [hasSessions]);

	const handleNext = useCallback(() => {
		if (!selectedSession) {
			return;
		}
		setStep("review");
	}, [selectedSession]);

	const handleBackToSessions = useCallback(() => {
		setStep("select-session");
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!selectedSession) {
			return;
		}

		setApiState({ status: "submitting" });

		try {
			const response = await fetch("/api/experiences/bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					experienceId: experience.id,
					sessionId: selectedSession.id,
					guests: guestCount,
				}),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { message?: string } | null;
				const message = data?.message ?? "We couldn’t submit your booking. Please try again.";
				setApiState({ status: "error", message });
				return;
			}

			const data = (await response.json()) as { booking?: { id: string } };
			setApiState({ status: "success", bookingReference: data.booking?.id ?? "" });
			setStep("complete");
		} catch {
			setApiState({ status: "error", message: "Network error. Please retry." });
		}
	}, [experience.id, guestCount, selectedSession]);

	// Ensure guest count is always within the available spots for the selected session
	useEffect(() => {
		if (!selectedSession) return;
		const max = selectedSession.availableSpots ?? selectedSession.capacity ?? 99;
		setGuestCount((prev) => Math.max(1, Math.min(prev, max)));
	}, [selectedSession]);

	const modalContent =
		!mounted || !open
			? null
			: createPortal(
					<div
						className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 px-4 py-6"
						role="dialog"
						aria-modal="true"
						style={overlayStyle}
						onClick={closeModal}
					>
						<div
							onClick={(event) => event.stopPropagation()}
							className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-border/60 bg-background text-foreground shadow-2xl"
						>
							<button
								type="button"
								onClick={closeModal}
								className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
								aria-label="Close reservation modal"
							>
								<X className="size-5" />
							</button>

							<div className="flex h-[70vh] flex-col">
								{/* Header */}
								<div className="shrink-0 border-b border-border/60 p-6">
									<div className="space-y-2 pr-10">
										<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Reserve a spot</p>
										<h2 className="text-2xl font-semibold text-foreground">{experience.title}</h2>
										<h3 className="text-xl font-semibold text-foreground">
											{step === "select-session" ? "Select your session" : step === "review" ? "Confirm & pay" : "Booking requested"}
										</h3>
										{step === "review" ? (
											<button
												type="button"
												onClick={handleBackToSessions}
												className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
											>
												<ArrowLeft className="size-3" /> Choose another session
											</button>
										) : null}
									</div>
								</div>

								{/* Content */}
								<div className="flex-1 overflow-y-auto p-6">
									{step === "select-session" ? (
										<div className="space-y-4">
											{/* Sticky guests stepper */}
											<div className="sticky top-0 z-10 -mx-6 border-b border-border/60 bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
												<div className="flex items-center justify-between">
													<p className="text-sm font-medium text-foreground">Spots</p>
													<Stepper
														value={String(guestCount)}
														onChange={(val) => {
															const numeric = Math.max(1, Math.min(Number.parseInt(val || "1", 10) || 1, maxReservableSpots));
															setGuestCount(numeric);
														}}
														min={1}
														max={maxReservableSpots}
													/>
												</div>
											</div>
											<p className="text-sm text-muted-foreground">Choose an available session to continue.</p>
											<div className="space-y-4 pr-1">
												{(() => {
													if (!sessions.length) return <p className="text-sm text-muted-foreground">No upcoming sessions are available at the moment.</p>;
													const groups = sessions.reduce((acc, s) => {
														const key = getDateKeyLocal(s.startAt);
														(acc[key] ||= []).push(s);
														return acc;
													}, {} as Record<string, typeof sessions>);
													const orderedKeys = Object.keys(groups).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
													return orderedKeys.map((key) => (
														<div key={key} className="space-y-2">
															<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{formatDayHeaderLabelLocal(key)}</p>
															<div className="space-y-3">
																{groups[key].map((session) => (
																	<SessionReservationCard
																		key={session.id}
																		session={session}
																		experience={{
																			currency: experience.currency,
																			basePrice: basePrice,
																			audience: experience.audience,
																			duration: experience.duration,
																			meetingAddress: experience.meetingAddress ?? null,
																			meetingCity: experience.meetingCity ?? null,
																			location: experience.location,
																		}}
																		variant="time"
																		selected={session.id === selectedSessionId}
																		disabled={(session.availableSpots ?? session.capacity ?? 0) <= 0}
																		onSelect={(id) => setSelectedSessionId(id)}
																	/>
																))}
															</div>
														</div>
													));
												})()}
											</div>
										</div>
									) : null}

									{step === "review" && selectedSession ? (
										<div className="space-y-5">
											<div className="space-y-3">
												{experience.heroImage ? (
													<div className="relative w-full overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "4 / 1" }}>
														<Image src={experience.heroImage} alt={experience.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
													</div>
												) : null}
												<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
													<div className="space-y-2 text-sm">
														<div className="flex items-center justify-between gap-3">
															<p className="font-medium text-foreground">{experience.title}</p>
															{typeof experience.averageRating === "number" && experience.reviewCount ? (
																<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
																	<Star className="size-3 text-amber-500" />
																	<span className="font-medium text-foreground">{experience.averageRating.toFixed(2)}</span>
																	<span>({experience.reviewCount})</span>
																</span>
															) : null}
														</div>
														<p className="text-muted-foreground">
															{formatDateWithRange(selectedSession.startAt, selectedSession.duration, experience.duration ?? null)}
														</p>
														{(() => {
															const top = selectedSession.meetingAddress ?? selectedSession.locationLabel ?? null;
															const city = experience.meetingCity ?? null;
															const display = top ? (city ? `${top}, ${city}` : top) : experience.meetingAddress ?? experience.location ?? null;
															return display ? (
																<p className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
																	<MapPin className="size-3" /> {display}
																</p>
															) : null;
														})()}
													</div>
												</div>
											</div>

											{/* Guests stepper removed from review step; only summary remains */}

											<div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
												<div className="flex items-center justify-between text-muted-foreground">
													<span>Price per spot</span>
													<span className="font-medium text-foreground">{formatCurrency(pricePerGuest, experience.currency)}</span>
												</div>
												<div className="flex items-center justify-between text-muted-foreground">
													<span>
														Total ({guestCount} spot{guestCount === 1 ? "" : "s"})
													</span>
													<span className="text-lg font-semibold text-foreground">{formatCurrency(totalPrice, experience.currency)}</span>
												</div>
												<p className="text-xs text-muted-foreground">No payment due yet. Your booking will be pending until the organizer confirms.</p>
											</div>

											{apiState.status === "error" ? <p className="text-sm font-medium text-destructive">{apiState.message}</p> : null}
										</div>
									) : null}

									{step === "complete" && apiState.status === "success" ? (
										<div className="space-y-4 text-center">
											<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
												<CheckCircle2 className="size-8" />
											</div>
											<h3 className="text-xl font-semibold text-foreground">Booking requested</h3>
											<p className="text-sm text-muted-foreground">
												We sent your request to the organizer. Your booking will stay pending until it&apos;s accepted.
											</p>
										</div>
									) : null}
								</div>

								{/* Footer */}
								<div className="shrink-0 border-t border-border/60 p-6">
									{step === "select-session" ? (
										<div className="flex justify-end">
											<CtaButton onClick={handleNext} disabled={!selectedSessionId} color="black">
												Next
											</CtaButton>
										</div>
									) : null}
									{step === "review" && selectedSession ? (
										<CtaButton onClick={handleSubmit} disabled={apiState.status === "submitting"} className="w-full" color="black">
											{apiState.status === "submitting" ? (
												<span className="inline-flex items-center gap-2">
													<Loader2 className="size-4 animate-spin" /> Confirming…
												</span>
											) : (
												"Confirm and pay"
											)}
										</CtaButton>
									) : null}
									{step === "complete" && apiState.status === "success" ? (
										<CtaButton onClick={closeModal} className="w-full" color="black">
											Close
										</CtaButton>
									) : null}
								</div>
							</div>
						</div>
					</div>,
					document.body
			  );

	return (
		<>
			<CtaButton
				label={buttonLabel}
				type="button"
				color="black"
				size={buttonSize === "lg" ? "lg" : buttonSize === "sm" ? "sm" : "md"}
				className={buttonClassName}
				onClick={openModal}
				disabled={!hasSessions}
			/>
			{modalContent}
		</>
	);
}
