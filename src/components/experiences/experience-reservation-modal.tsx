"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Star, X, Ticket } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";

import { applyCouponToBooking, removeCouponFromBooking } from "@/app/actions/coupons";

import { CtaButton } from "@/components/ui/cta-button";
import { SessionReservationCard } from "@/components/experiences/session-reservation-card";
import { AuthModal } from "@/components/auth/auth-modal";
import { parseDurationToMinutes } from "@/lib/duration";
import { sanitizeRelativePath } from "@/lib/sanitize-relative-path";
import { useCountdown } from "@/hooks/use-countdown";
import { EXPERIENCE_RESERVATION_STATUS_EVENT, type ReservationStatusDetail } from "@/lib/events/reservations";

const overlayStyle: CSSProperties = { backdropFilter: "blur(6px)" };

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
	buttonSize?: "sm" | "md" | "lg";
	buttonClassName?: string;
	buttonId?: string;
	viewerPendingBooking?: {
		id: string;
		sessionId: string;
		guests: number;
		expiresAt: string | null;
	} | null;
	disabled?: boolean;
};

type Step = "select-session" | "payment-method" | "pay" | "complete";

type ApiState = { status: "idle" } | { status: "submitting" } | { status: "success"; bookingReference: string } | { status: "error"; message: string };

type ActiveBooking = {
	id: string;
	sessionId: string;
	guests: number;
	expiresAt: string | null;
};

const RESERVATION_STEP_KEY_PREFIX = "experience-reservation-step:";
const PERSISTABLE_STEPS: Step[] = ["payment-method", "pay"];

type PayPalApproveData = {
	orderID?: string;
};

type PayPalButtonsInstance = {
	render: (container: HTMLElement) => void;
};

type PayPalNamespace = {
	Buttons: (config: {
		style: { layout: string; color: string; shape: string; label: string };
		fundingSource: unknown;
		createOrder: () => Promise<string>;
		onApprove: (data: PayPalApproveData) => Promise<void>;
		onCancel: () => void;
		onError: (err: unknown) => void;
	}) => PayPalButtonsInstance;
	FUNDING: { PAYPAL: unknown };
};

function getPayPalNamespace(): PayPalNamespace | null {
	if (typeof window === "undefined") {
		return null;
	}
	const candidate = (window as Window & { paypal?: PayPalNamespace }).paypal;
	return candidate ?? null;
}

// removed unused formatDateTime helper

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

import { formatCurrency } from "@/lib/format-currency";

export function ExperienceReservationModal({
	experience,
	sessions,
	buttonLabel = "Reserve a spot",
	buttonSize,
	buttonClassName,
	buttonId,
	viewerPendingBooking = null,
	disabled = false,
}: ExperienceReservationModalProps) {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<Step>(viewerPendingBooking ? "payment-method" : "select-session");
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(viewerPendingBooking?.sessionId ?? null);
	const [guestCount, setGuestCount] = useState(viewerPendingBooking?.guests ?? 1);
	const [apiState, setApiState] = useState<ApiState>({ status: "idle" });
	const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "cash">("card");
	const [enabledProviders, setEnabledProviders] = useState<Array<"STRIPE" | "PAYPAL" | "PAYZONE" | "CMI" | "CASH"> | null>(null);
	const [providersList, setProvidersList] = useState<Array<{
		key: string;
		type: "CARD" | "CASH" | "PAYPAL";
		logoUrl?: string | null;
		isEnabled?: boolean;
		name?: string;
	}> | null>(null);
	// Local state for in-context PayPal
	const [bookingIdForPayment, setBookingIdForPayment] = useState<string | null>(viewerPendingBooking?.id ?? null);
	const [paymentIdForPayment, setPaymentIdForPayment] = useState<string | null>(null);
	const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
	const [paypalReady, setPaypalReady] = useState(false);
	const [paypalLoading, setPaypalLoading] = useState(false);
	const [preflightError, setPreflightError] = useState<string | null>(null);
	const paypalContainerRef = useRef<HTMLDivElement | null>(null);
	const initializedStepFromStorage = useRef(false);
	const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(() =>
		viewerPendingBooking ? { ...viewerPendingBooking } : null
	);
	const [reservationError, setReservationError] = useState<string | null>(null);
	const [reservationLoading, setReservationLoading] = useState(false);
	const [cancelError, setCancelError] = useState<string | null>(null);
	const [cancelingBooking, setCancelingBooking] = useState(false);
	const getProgressStorageKey = useCallback((bookingId: string) => `${RESERVATION_STEP_KEY_PREFIX}${bookingId}`, []);
	const readStoredStep = useCallback(
		(bookingId: string): Step | null => {
			if (typeof window === "undefined") return null;
			const raw = window.localStorage.getItem(getProgressStorageKey(bookingId));
			return raw === "payment-method" || raw === "pay" ? (raw as Step) : null;
		},
		[getProgressStorageKey]
	);
	const persistStep = useCallback(
		(bookingId: string, value: Step) => {
			if (typeof window === "undefined") return;
			if (!PERSISTABLE_STEPS.includes(value)) {
				window.localStorage.removeItem(getProgressStorageKey(bookingId));
				return;
			}
			window.localStorage.setItem(getProgressStorageKey(bookingId), value);
		},
		[getProgressStorageKey]
	);
	const clearStoredStep = useCallback(
		(bookingId: string) => {
			if (typeof window === "undefined") return;
			window.localStorage.removeItem(getProgressStorageKey(bookingId));
		},
		[getProgressStorageKey]
	);
	const releaseBookingHold = useCallback(
		(bookingId?: string | null) => {
			if (bookingId) {
				clearStoredStep(bookingId);
			}
			setActiveBooking(null);
			setBookingIdForPayment(null);
			setPaymentIdForPayment(null);
			setPaypalOrderId(null);
			setPreflightError(null);
		},
		[clearStoredStep]
	);
	const resetBookingState = useCallback(
		(bookingId?: string | null, options?: { preserveError?: boolean }) => {
			releaseBookingHold(bookingId);
			setSelectedSessionId(null);
			setGuestCount(1);
			setStep("select-session");
			setApiState({ status: "idle" });
			setReservationLoading(false);
			setPaypalLoading(false);
			setCancelError(null);
			if (!options?.preserveError) {
				setReservationError(null);
			}
		},
		[releaseBookingHold]
	);
	const cancelActiveBooking = useCallback(
		async ({ silent, booking }: { silent?: boolean; booking?: ActiveBooking } = {}) => {
			const targetBooking = booking ?? activeBooking;
			if (!targetBooking) {
				return;
			}
			setCancelError(null);
			if (!silent) {
				setReservationError(null);
			}
			setCancelingBooking(true);
			try {
				const response = await fetch("/api/experiences/bookings/cancel", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ bookingId: targetBooking.id }),
				});
				if (!response.ok && response.status !== 404) {
					const data = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(data?.message ?? "We couldn’t cancel your reservation. Please try again.");
				}
				resetBookingState(targetBooking.id, { preserveError: silent });
				if (!silent) {
					setReservationError("Reservation cancelled. You can choose another session.");
				}
			} catch (error) {
				if (!silent) {
					setCancelError(error instanceof Error ? error.message : "Unable to cancel reservation. Please retry.");
				}
				throw error;
			} finally {
				setCancelingBooking(false);
			}
		},
		[activeBooking, resetBookingState]
	);
	const dispatchReservationStatus = useCallback(
		(nextBooking: ActiveBooking | null) => {
			if (typeof window === "undefined") {
				return;
			}
			const detail: ReservationStatusDetail = {
				experienceId: experience.id,
				bookingId: nextBooking?.id ?? null,
				expiresAt: nextBooking?.expiresAt ?? null,
			};
			window.dispatchEvent(new CustomEvent(EXPERIENCE_RESERVATION_STATUS_EVENT, { detail }));
		},
		[experience.id]
	);
	const handleHoldExpired = useCallback(() => {
		if (!activeBooking) {
			return;
		}
		const snapshot = { ...activeBooking };
		void cancelActiveBooking({ silent: true, booking: snapshot }).catch(() => {
			resetBookingState(snapshot.id, { preserveError: true });
		});
		setReservationError("Your reservation hold expired. Please select a session again.");
	}, [activeBooking, cancelActiveBooking, resetBookingState]);
	const { formatted: countdownLabel, isExpired: countdownExpired } = useCountdown(activeBooking?.expiresAt ?? null, {
		onExpire: handleHoldExpired,
	});
	const { status: sessionStatus } = useSession();
	const isAuthenticated = sessionStatus === "authenticated";
	const [authOpen, setAuthOpen] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "register">("register");
	const [authRedirect, setAuthRedirect] = useState<string | null>(null);

	const sessionLookup = useMemo(() => {
		return new Map(sessions.map((session) => [session.id, session]));
	}, [sessions]);

	const selectedSession = selectedSessionId ? sessionLookup.get(selectedSessionId) ?? null : null;

	const basePrice = experience.price;
	const pricePerGuest = selectedSession?.priceOverride ?? basePrice;
	const totalPrice = pricePerGuest * guestCount;
	const hasSessions = sessions.length > 0;
	const showCountdown = !!activeBooking && !countdownExpired;
	const showCountdownBanner = showCountdown && (step === "payment-method" || step === "pay");
	const primaryButtonLabel =
		showCountdown && countdownLabel
			? `Complete your reservation · ${countdownLabel}`
			: activeBooking
				? "Complete your reservation"
				: buttonLabel;
	const primaryButtonColor: "amber" | "black" =
		showCountdown || activeBooking ? "amber" : "black";
	const countdownBanner =
		showCountdownBanner && countdownLabel ? (
			<div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
				<div className="flex flex-col gap-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em]">Complete checkout in</p>
						<p className="font-mono text-2xl font-semibold">{countdownLabel}</p>
						<p className="text-xs text-amber-900/80">Your spots remain on hold for 15 minutes.</p>
					</div>
					<button
						type="button"
						onClick={() => {
							void cancelActiveBooking().catch(() => undefined);
						}}
						disabled={cancelingBooking}
						className="inline-flex items-center justify-center rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{cancelingBooking ? "Cancelling…" : "Cancel booking"}
					</button>
				</div>
				{cancelError ? <p className="mt-2 text-sm font-medium text-destructive">{cancelError}</p> : null}
			</div>
		) : null;

	// Compute the maximum reservable spots for the selected session
	const maxReservableSpots = selectedSession ? selectedSession.availableSpots ?? selectedSession.capacity ?? 99 : 99;

	const openModal = useCallback(() => {
		if (!hasSessions) {
			return;
		}
		setApiState({ status: "idle" });
		setPreflightError(null);
		if (activeBooking) {
			setSelectedSessionId(activeBooking.sessionId);
			setGuestCount(activeBooking.guests);
			const storedStep = readStoredStep(activeBooking.id);
			setStep(storedStep ?? "payment-method");
		} else {
			setSelectedSessionId(null);
			setGuestCount(1);
			setStep("select-session");
		}
		setOpen(true);
	}, [activeBooking, hasSessions, readStoredStep]);

	const closeModal = useCallback(() => {
		setOpen(false);
	}, []);

	const handleAuthIntent = useCallback(() => {
		setAuthMode("register");
		setAuthOpen(true);
		if (typeof window !== "undefined") {
			const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			const safeNext = sanitizeRelativePath(nextPath) ?? "/";
			setAuthRedirect(safeNext);
		} else {
			setAuthRedirect("/");
		}
	}, []);

	const handleTriggerClick = useCallback(() => {
		if (!hasSessions) {
			return;
		}
		if (sessionStatus === "loading") {
			return;
		}
		if (!isAuthenticated) {
			handleAuthIntent();
			return;
		}

		openModal();
	}, [handleAuthIntent, hasSessions, isAuthenticated, openModal, sessionStatus]);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (initializedStepFromStorage.current) {
			return;
		}
		if (!activeBooking?.id) {
			return;
		}
		const stored = readStoredStep(activeBooking.id);
		if (stored) {
			setStep(stored);
		}
		initializedStepFromStorage.current = true;
	}, [activeBooking?.id, readStoredStep]);

	useEffect(() => {
		dispatchReservationStatus(activeBooking);
	}, [activeBooking, dispatchReservationStatus]);

	useEffect(() => {
		if (activeBooking?.id) {
			setBookingIdForPayment(activeBooking.id);
		} else {
			setBookingIdForPayment(null);
		}
	}, [activeBooking?.id]);

	useEffect(() => {
		if (!activeBooking?.id) {
			return;
		}
		if (step === "select-session" || step === "complete") {
			clearStoredStep(activeBooking.id);
			return;
		}
		if (step === "payment-method" || step === "pay") {
			persistStep(activeBooking.id, step);
		}
	}, [activeBooking?.id, step, persistStep, clearStoredStep]);

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

	// Load public payment settings (enabled providers) for showing payment methods
	useEffect(() => {
		let active = true;
		(async () => {
			try {
				const res = await fetch("/api/settings/payments", { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as {
					enabledProviders?: string[];
					paymentBrandImageUrl?: string | null;
					providers?: Array<{ key: string; type: "CARD" | "CASH" | "PAYPAL"; logoUrl?: string | null; isEnabled?: boolean; name?: string }>;
				} | null;
				if (active && data) {
					setEnabledProviders((data.enabledProviders ?? []).filter(Boolean) as Array<"STRIPE" | "PAYPAL" | "PAYZONE" | "CMI" | "CASH">);
					setProvidersList(Array.isArray(data.providers) ? data.providers : []);
				}
			} catch {
				// ignore
			}
		})();
		return () => {
			active = false;
		};
	}, [open]);

	// Allow opening via a global custom event for external triggers (e.g., sticky header)
	useEffect(() => {
		const listener = () => handleTriggerClick();
		window.addEventListener("open-experience-reservation", listener);
		return () => window.removeEventListener("open-experience-reservation", listener);
	}, [handleTriggerClick]);

	const handleNext = useCallback(async () => {
		if (!selectedSession || reservationLoading) {
			return;
		}

		if (activeBooking) {
			const stored = readStoredStep(activeBooking.id);
			setStep(stored ?? "payment-method");
			return;
		}

		setReservationError(null);
		setReservationLoading(true);
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
			const data = (await response.json().catch(() => null)) as {
				message?: string;
				booking?: { id: string; sessionId: string; guests: number; expiresAt?: string | null };
			} | null;

			if (!response.ok) {
				const booking = data?.booking;
				if (response.status === 409 && booking) {
					const normalized: ActiveBooking = {
						id: booking.id,
						sessionId: booking.sessionId,
						guests: booking.guests,
						expiresAt: booking.expiresAt ?? null,
					};
					setActiveBooking(normalized);
					setBookingIdForPayment(normalized.id);
					setSelectedSessionId(normalized.sessionId);
					setGuestCount(normalized.guests);
					const storedStep = readStoredStep(normalized.id);
					setStep(storedStep ?? "payment-method");
					setReservationError(data?.message ?? "You already have a pending reservation. Continue checkout below.");
					return;
				}
				throw new Error(data?.message ?? "We couldn’t start your reservation. Please try again.");
			}

			const booking = data?.booking;
			if (!booking?.id) {
				throw new Error("Booking response was missing required fields.");
			}

			const normalized: ActiveBooking = {
				id: booking.id,
				sessionId: booking.sessionId,
				guests: booking.guests,
				expiresAt: booking.expiresAt ?? null,
			};
			setActiveBooking(normalized);
			setBookingIdForPayment(normalized.id);
			setSelectedSessionId(normalized.sessionId);
			setGuestCount(normalized.guests);
			setStep("payment-method");
		} catch (error) {
			setReservationError(error instanceof Error ? error.message : "Unexpected error. Please retry.");
		} finally {
			setReservationLoading(false);
		}
	}, [activeBooking, experience.id, guestCount, readStoredStep, reservationLoading, selectedSession]);

	const handleBackToSessions = useCallback(() => {
		if (activeBooking) {
			setReservationError("Cancel your pending reservation to choose another session.");
			return;
		}
		setStep("select-session");
	}, [activeBooking]);

	const handleContinueToPay = useCallback(() => {
		if (!selectedSession || !activeBooking) {
			setReservationError("Select a session and start your reservation first.");
			return;
		}
		setStep("pay");
	}, [activeBooking, selectedSession]);

	const handleBackToPaymentMethod = useCallback(() => {
		setStep("payment-method");
	}, []);

	// --- Coupon Logic ---
	const [couponCode, setCouponCode] = useState("");
	const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number } | null>(null);
	const [couponError, setCouponError] = useState<string | null>(null);
	const [couponLoading, setCouponLoading] = useState(false);

	// Import actions dynamically or assume they are available via import at top
	// Note: Since I can't add imports easily with replace_file_content without context of top, 
	// I made sure to implement actions in a way that I can move forward. 
	// Ideally I would add `import { applyCouponToBooking, removeCouponFromBooking } from "@/app/actions/coupons"` at the top.
	// For now, I will use "require" style or just assume imports are added in next step?
	// Actually, I should use multi_replace for imports + logic.
	// But I'm using replace_file_content here for the logic block.
	// I will do imports separately or assume I can't.
	// Let's rely on adding imports in a separate call or use multi_replace.
	// I'll proceed with logic here.

	const handleApplyCoupon = async () => {
		if (!activeBooking || !couponCode) return;
		setCouponLoading(true);
		setCouponError(null);

		try {
			// Need to import this. For now assuming it's available or I'll fix imports next.
			const { applyCouponToBooking } = await import("@/app/actions/coupons");
			const res = await applyCouponToBooking(activeBooking.id, couponCode);
			if (res.error) {
				setCouponError(res.error);
			} else if (res.success && res.newPrice !== undefined) {
				setAppliedCoupon({ code: res.code!, discount: res.discountAmount! });
				// Update visual total? But `activeBooking` doesn't hold price. 
				// The modal calculates price from `guests * pricePerGuest`. 
				// I need a way to override the displayed total price.
				// I'll add a `priceOverride` state?
				// Or better, `activeBooking` should just be the source of truth? 
				// But `activeBooking` type doesn't have price field.
				// I'll add `discountedPrice` state.
				setDiscountedTotal(res.newPrice);
			}
		} catch (err) {
			setCouponError("Failed to apply coupon");
		} finally {
			setCouponLoading(false);
		}
	};

	const handleRemoveCoupon = async () => {
		if (!activeBooking) return;
		setCouponLoading(true);
		try {
			const { removeCouponFromBooking } = await import("@/app/actions/coupons");
			const res = await removeCouponFromBooking(activeBooking.id);
			if (res.success) {
				setAppliedCoupon(null);
				setCouponCode("");
				setDiscountedTotal(null); // Revert to calc
			} else {
				setCouponError(res.error || "Failed to remove");
			}
		} finally {
			setCouponLoading(false);
		}
	}

	const [discountedTotal, setDiscountedTotal] = useState<number | null>(null);
	const displayTotal = discountedTotal !== null ? discountedTotal : totalPrice;

	const handleSubmit = useCallback(async () => {
		if (!selectedSession || !activeBooking) {
			setReservationError("Select a session and start your reservation first.");
			return;
		}

		setApiState({ status: "submitting" });

		try {
			const bookingId = activeBooking.id;
			const origin = window.location.origin;
			const successUrl = `${origin}/dashboard/explorer/reservations?booking=${encodeURIComponent(bookingId)}&paid=1`;
			const cancelUrl = `${origin}/dashboard/explorer/reservations?booking=${encodeURIComponent(bookingId)}&cancelled=1`;
			const checkout = await fetch("/api/payments/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					bookingId,
					successUrl,
					cancelUrl,
					providerId: paymentMethod === "cash" ? "cash" : paymentMethod === "paypal" ? "paypal" : undefined,
				}),
			});
			if (!checkout.ok) {
				const d = (await checkout.json().catch(() => null)) as { message?: string } | null;
				const message = d?.message ?? "We couldn’t start checkout. Please try again.";
				setApiState({ status: "error", message });
				return;
			}
			const ch = (await checkout.json()) as { url: string };
			window.location.href = ch.url;
		} catch {
			setApiState({ status: "error", message: "Network error. Please retry." });
		}
	}, [activeBooking, paymentMethod, selectedSession]);

	// Prepare booking + PayPal order for in-context popup
	const preparePaypalCheckout = useCallback(async (): Promise<{ ok: boolean; orderId: string | null }> => {
		const bookingId = bookingIdForPayment ?? activeBooking?.id ?? null;
		if (!bookingId) {
			setPreflightError("Create a reservation before continuing with PayPal.");
			return { ok: false, orderId: null };
		}
		try {
			const origin = window.location.origin;
			const successUrl = `${origin}/dashboard/explorer/reservations?booking=${encodeURIComponent(bookingId)}&paid=1`;
			const cancelUrl = `${origin}/dashboard/explorer/reservations?booking=${encodeURIComponent(bookingId)}&cancelled=1`;
			const checkout = await fetch("/api/payments/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bookingId, successUrl, cancelUrl, providerId: "paypal" }),
			});
			if (!checkout.ok) {
				const msg = (await checkout.json().catch(() => null)) as { message?: string } | null;
				setPreflightError(msg?.message ?? "Failed to start checkout. Please try again.");
				return { ok: false, orderId: null };
			}
			const ch = (await checkout.json()) as { paymentId?: string | null; providerPaymentId?: string | null };
			if (ch.paymentId) setPaymentIdForPayment(ch.paymentId);
			const orderId = ch.providerPaymentId ?? null;
			setPaypalOrderId(orderId);
			setPreflightError(null);
			return { ok: !!orderId, orderId };
		} catch {
			setPreflightError("Network error while preparing PayPal. Please retry.");
			return { ok: false, orderId: null };
		}
	}, [activeBooking?.id, bookingIdForPayment]);

	// Lazy-load PayPal SDK script when needed
	useEffect(() => {
		if (step !== "pay" || paymentMethod !== "paypal") return;
		let cancelled = false;
		(async () => {
			try {
				const existingPaypal = getPayPalNamespace();
				if (existingPaypal) {
					if (!cancelled) setPaypalReady(true);
					return;
				}
				const res = await fetch("/api/payments/paypal/sdk-params", { cache: "no-store" });
				if (!res.ok) return;
				const { clientId } = (await res.json()) as { clientId: string };
				const script = document.createElement("script");
				const sdkCurrency = encodeURIComponent((experience.currency || "MAD").toUpperCase());
				script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&intent=capture&currency=${sdkCurrency}`;
				script.async = true;
				script.onload = () => {
					if (!cancelled) setPaypalReady(true);
				};
				document.body.appendChild(script);
			} catch {
				// ignore
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [experience.currency, paymentMethod, step]);

	// Preflight-create order when entering pay step with PayPal
	useEffect(() => {
		if (step !== "pay" || paymentMethod !== "paypal") return;
		let active = true;
		(async () => {
			setPaypalLoading(true);
			const res = await preparePaypalCheckout();
			setPaypalLoading(false);
			if (!active) return;
			if (!res.ok) {
				// leave error message in preflightError
				return;
			}
		})();
		return () => {
			active = false;
		};
	}, [step, paymentMethod, preparePaypalCheckout]);

	// Render PayPal Buttons when SDK ready and container mounted
	useEffect(() => {
		if (step !== "pay" || paymentMethod !== "paypal") return;
		// Only render buttons if SDK is ready, container exists, and we have a prepared order id without preflight error
		if (!paypalReady || !paypalContainerRef.current) return;
		if (preflightError || !paypalOrderId) return;
		const paypal = getPayPalNamespace();
		if (!paypal) return;
		// Clear container before rendering (avoid duplicate buttons on re-renders)
		paypalContainerRef.current.innerHTML = "";
		const buttons = paypal.Buttons({
			style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
			fundingSource: paypal.FUNDING.PAYPAL,
			createOrder: async () => {
				if (!paypalOrderId) {
					throw new Error("Failed to create PayPal order");
				}
				return paypalOrderId;
			},
			onApprove: async (data: PayPalApproveData) => {
				try {
					const resp = await fetch("/api/payments/paypal/capture", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ orderId: data?.orderID, bookingId: bookingIdForPayment, paymentId: paymentIdForPayment }),
					});
					if (resp.ok) {
						setApiState({ status: "success", bookingReference: bookingIdForPayment ?? "" });
						releaseBookingHold(bookingIdForPayment ?? activeBooking?.id ?? null);
						setStep("complete");
					} else {
						const msg = (await resp.json().catch(() => null)) as { message?: string } | null;
						setApiState({ status: "error", message: msg?.message ?? "PayPal capture failed. Please try another method." });
					}
				} catch {
					setApiState({ status: "error", message: "PayPal capture error. Please try again." });
				}
			},
			onCancel: () => {
				// No-op; user can try again or switch method
			},
			onError: (err: unknown) => {
				// Provide better diagnostics than the generic SDK message
				console.error("PayPal Buttons error:", err);
				setApiState({ status: "error", message: "PayPal error. Please try again or use another method." });
			},
		});
		buttons.render(paypalContainerRef.current);
		// No teardown API needed; container cleared above
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paypalReady, step, paymentMethod, paypalOrderId, bookingIdForPayment, paymentIdForPayment, preflightError]);

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
									<h3 className="text-lg font-semibold text-foreground">
										{step === "select-session"
											? "Select your session"
											: step === "payment-method"
												? "Check out"
												: step === "pay"
													? "Pay and confirm"
													: "Booking requested"}
									</h3>
									{(step === "payment-method" || step === "pay") && !activeBooking ? (
										<button
											type="button"
											onClick={handleBackToSessions}
											className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
										>
											<ArrowLeft className="size-3" /> Choose another session
										</button>
									) : null}
									{step === "pay" ? (
										<button
											type="button"
											onClick={handleBackToPaymentMethod}
											className="ml-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
										>
											<ArrowLeft className="size-3" /> Change payment method
										</button>
									) : null}
								</div>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-y-auto p-6 pt-0">
								{reservationError ? <p className="mb-4 text-sm font-medium text-destructive">{reservationError}</p> : null}
								{countdownBanner}
								{step === "select-session" ? (
									<div className="space-y-4">
										{activeBooking ? (
											<div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
												You already have a pending reservation. Complete checkout or cancel it to choose a different date or group size.
											</div>
										) : null}
										{/* Sticky guests stepper
										<div className="sticky top-0 z-10 -mx-6 border-b border-border/60 bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
											<div className="flex items-center justify-between">
												<p className="text-sm font-medium text-foreground">Spots</p>
												<Stepper
													value={String(guestCount)}
													onChange={(val) => {
														if (activeBooking) {
															setReservationError("Cancel your pending reservation to adjust the number of spots.");
															return;
														}
														const numeric = Math.max(1, Math.min(Number.parseInt(val || "1", 10) || 1, maxReservableSpots));
														setGuestCount(numeric);
													}}
													min={1}
													max={maxReservableSpots}
													className={activeBooking ? "opacity-60 pointer-events-none" : undefined}
												/>
											</div>
										</div> */}
										<div className="space-y-4 pt-4 pr-1">
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
																	variant="full"
																	selected={session.id === selectedSessionId}
																	disabled={(session.availableSpots ?? session.capacity ?? 0) <= 0 || (!!activeBooking && session.id !== activeBooking.sessionId)}
																	onSelect={(id) => {
																		if (activeBooking && id !== activeBooking.sessionId) {
																			setReservationError("Cancel your pending reservation to pick another session.");
																			return;
																		}
																		setSelectedSessionId(id);
																	}}
																/>
															))}
														</div>
													</div>
												));
											})()}
										</div>
									</div>
								) : null}

								{step === "payment-method" && selectedSession ? (
									<div className="space-y-5">
										<div className="space-y-3">
											<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
												<div className="space-y-2 text-sm">
													<div className="flex items-center justify-between gap-3">
														<p className="font-medium text-foreground">{experience.title}</p>
													</div>
													<p className="text-muted-foreground">
														{formatDateWithRange(selectedSession.startAt, selectedSession.duration, experience.duration ?? null)}
													</p>
												</div>
											</div>
										</div>
										<div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
											<div className="mt-3 grid gap-2">
												<p className="text-xs font-medium text-foreground">Select a payment method</p>
												<div className="flex flex-col gap-2">
													{(() => {
														const allowed = new Set((enabledProviders ?? ["STRIPE", "PAYPAL", "CASH"]).map((p) => p.toUpperCase()));
														const showCard = allowed.has("STRIPE") || allowed.has("PAYZONE") || allowed.has("CMI");
														const showPaypal = allowed.has("PAYPAL");
														const cardLogo = (() => {
															const list = providersList ?? [];
															const p = list.find((x) => x.isEnabled && x.type === "CARD" && typeof x.logoUrl === "string" && x.logoUrl.length > 0);
															return p?.logoUrl ?? null;
														})();
														const paypalLogo = (() => {
															const list = providersList ?? [];
															const p = list.find((x) => x.isEnabled && x.type === "PAYPAL" && typeof x.logoUrl === "string" && x.logoUrl.length > 0);
															return p?.logoUrl ?? null;
														})();
														const showCash = allowed.has("CASH");
														return (
															<>
																{showCard ? (
																	<label className="flex items-center justify-between rounded-xl border border-border/60 p-4 hover:bg-muted/40">
																		<div className="flex items-center gap-3">
																			<input
																				type="radio"
																				name="payment-method"
																				className="size-4"
																				checked={paymentMethod === "card"}
																				onChange={() => setPaymentMethod("card")}
																			/>
																			<div className="flex flex-col">
																				<span className="text-base font-semibold text-foreground">Credit Card</span>
																				<span className="text-xs text-muted-foreground">Takes minute</span>
																			</div>
																		</div>
																		<div className="flex items-center gap-2">
																			{cardLogo ? (
																				<div className="relative h-5 w-16">
																					<Image src={cardLogo} alt="Card payment" fill className="object-contain" sizes="64px" />
																				</div>
																			) : (
																				<>
																					<span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
																						VISA
																					</span>
																					<span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
																						MASTERCARD
																					</span>
																				</>
																			)}
																		</div>
																	</label>
																) : null}
																{showPaypal ? (
																	<label className="flex items-center justify-between rounded-xl border border-border/60 p-4 hover:bg-muted/40">
																		<div className="flex items-center gap-3">
																			<input
																				type="radio"
																				name="payment-method"
																				className="size-4"
																				checked={paymentMethod === "paypal"}
																				onChange={() => setPaymentMethod("paypal")}
																			/>
																			<div className="flex flex-col">
																				<span className="text-base font-semibold text-foreground">PayPal</span>
																				<span className="text-xs text-muted-foreground">Takes minute</span>
																			</div>
																		</div>
																		<div className="flex items-center">
																			{paypalLogo ? (
																				<div className="relative h-5 w-16">
																					<Image src={paypalLogo} alt="PayPal" fill className="object-contain" sizes="64px" />
																				</div>
																			) : (
																				<span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
																					PayPal
																				</span>
																			)}
																		</div>
																	</label>
																) : null}
																{showCash ? (
																	<label className="flex items-center justify-between rounded-xl border border-border/60 p-4 hover:bg-muted/40">
																		<div className="flex items-center gap-3">
																			<input
																				type="radio"
																				name="payment-method"
																				className="size-4"
																				checked={paymentMethod === "cash"}
																				onChange={() => setPaymentMethod("cash")}
																			/>
																			<div className="flex flex-col">
																				<span className="text-base font-semibold text-foreground">Cash</span>
																				<span className="text-xs text-muted-foreground">Pay on arrival</span>
																			</div>
																		</div>
																	</label>
																) : null}
															</>
														);
													})()}
												</div>
											</div>
											<p className="text-xs text-muted-foreground">Continue to payment to enter details or open PayPal.</p>
										</div>
										{apiState.status === "error" ? <p className="text-sm font-medium text-destructive">{apiState.message}</p> : null}
									</div>
								) : null}
								{step === "payment-method" && !selectedSession ? (
									<div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
										The session attached to your reservation is no longer available. Cancel it to choose another date.
									</div>
								) : null}

								{step === "pay" && selectedSession ? (
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

										{/* Guests stepper removed from pay step; only summary + payment remain */}

										<div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
											<div className="flex items-center justify-between text-muted-foreground">
												<span>Price per spot</span>
												<span className="font-medium text-foreground">{formatCurrency(pricePerGuest, experience.currency)}</span>
											</div>

											<div className="py-2 border-t border-border/40 my-2 pt-2">
												{!appliedCoupon ? (
													<div className="flex gap-2">
														<input
															className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-primary/60"
															placeholder="Add promo code"
															value={couponCode}
															onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
															disabled={couponLoading}
														/>
														<button
															type="button"
															onClick={handleApplyCoupon}
															disabled={!couponCode || couponLoading}
															className="rounded-md bg-secondary/80 px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary disabled:opacity-50"
														>
															{couponLoading ? <Loader2 className="size-3 animate-spin" /> : "Apply"}
														</button>
													</div>
												) : (
													<div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-50/50 p-2 text-xs text-emerald-700">
														<div className="flex items-center gap-1.5">
															<Ticket className="size-3.5" />
															<span>Coupon <strong>{appliedCoupon.code}</strong> applied</span>
														</div>
														<button
															type="button"
															onClick={handleRemoveCoupon}
															disabled={couponLoading}
															className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 hover:underline"
														>
															Remove
														</button>
													</div>
												)}
												{couponError ? <p className="mt-1.5 text-xs text-destructive">{couponError}</p> : null}
											</div>

											{appliedCoupon ? (
												<div className="flex items-center justify-between text-emerald-600">
													<span>Discount</span>
													<span className="font-medium">-{formatCurrency(appliedCoupon.discount, experience.currency)}</span>
												</div>
											) : null}

											<div className="flex items-center justify-between text-muted-foreground pt-1">
												<span>
													Total ({guestCount} spot{guestCount === 1 ? "" : "s"})
												</span>
												<span className="text-lg font-semibold text-foreground">{formatCurrency(displayTotal, experience.currency)}</span>
											</div>
											<div className="mt-3 grid gap-2">
												{/* Payment-method specific section */}
												<div className="mt-3 space-y-3">
													{paymentMethod === "card" ? (
														<div className="rounded-xl border border-border/60 p-4">
															<p className="mb-3 text-sm font-medium text-foreground">Card details</p>
															<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
																<input
																	className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
																	placeholder="Name on card"
																/>
																<input
																	className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
																	placeholder="Card number"
																	inputMode="numeric"
																/>
																<input
																	className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
																	placeholder="MM/YY"
																	inputMode="numeric"
																/>
																<input
																	className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
																	placeholder="CVC"
																	inputMode="numeric"
																/>
															</div>
															<p className="mt-2 text-xs text-muted-foreground">
																Cards are processed securely. For now, fields are illustrative and you may be redirected depending on provider.
															</p>
														</div>
													) : null}
													{paymentMethod === "paypal" ? (
														<div className="rounded-xl border border-border/60 p-4">
															<p className="mb-3 text-sm font-medium text-foreground">Pay with PayPal</p>
															{preflightError ? <p className="mb-2 text-xs font-medium text-destructive">{preflightError}</p> : null}
															<div ref={paypalContainerRef} />
															{paypalLoading ? (
																<p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
																	<Loader2 className="size-3 animate-spin" /> Preparing PayPal…
																</p>
															) : null}
															<p className="mt-2 text-xs text-muted-foreground">
																A small PayPal window will open to approve your payment. You’ll stay on this page.
															</p>
														</div>
													) : null}
													{paymentMethod === "cash" ? (
														<div className="rounded-xl border border-border/60 p-4">
															<p className="mb-1 text-sm font-medium text-foreground">Pay with cash on arrival</p>
															<p className="text-xs text-muted-foreground">Your spot will be reserved. Please bring exact change to the event.</p>
														</div>
													) : null}
												</div>
											</div>
										</div>

										{apiState.status === "error" ? <p className="text-sm font-medium text-destructive">{apiState.message}</p> : null}
									</div>
								) : null}
								{step === "pay" && !selectedSession ? (
									<div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
										We lost the session details for this reservation. Please cancel and start again.
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
									<div className="flex items-center justify-between">
										<div className="flex items-center justify-between">
											<p className="text-sm font-medium text-foreground mr-4">Spots</p>
											<Stepper
												value={String(guestCount)}
												onChange={(val) => {
													if (activeBooking) {
														setReservationError("Cancel your pending reservation to adjust the number of spots.");
														return;
													}
													const numeric = Math.max(1, Math.min(Number.parseInt(val || "1", 10) || 1, maxReservableSpots));
													setGuestCount(numeric);
												}}
												min={1}
												max={maxReservableSpots}
												className={activeBooking ? "opacity-60 pointer-events-none" : undefined}
											/>
										</div>
										<div className="flex items-center gap-4">
											{selectedSession ? (
												<div className="text-right">
													<p className="text-lg font-semibold text-foreground">{formatCurrency(totalPrice, experience.currency)}</p>
												</div>
											) : null}
											<CtaButton onClick={handleNext} disabled={reservationLoading || (!selectedSessionId && !activeBooking)} color="black">
												{reservationLoading ? "Securing your spots…" : activeBooking ? "Resume checkout" : "Book Now"}
											</CtaButton>
										</div>
									</div>
								) : null}
								{step === "payment-method" && selectedSession ? (
									<div className="flex justify-end">
										<CtaButton onClick={handleContinueToPay} color="black" disabled={!activeBooking}>
											Continue to payment
										</CtaButton>
									</div>
								) : null}
								{step === "pay" && selectedSession ? (
									paymentMethod === "paypal" ? (
										<div className="text-xs text-muted-foreground text-center">Use the PayPal button above to complete payment.</div>
									) : (
										<CtaButton onClick={handleSubmit} disabled={apiState.status === "submitting"} className="w-full" color="black">
											{apiState.status === "submitting" ? (
												<span className="inline-flex items-center gap-2">
													<Loader2 className="size-4 animate-spin" /> Confirming…
												</span>
											) : (
												"Confirm and pay"
											)}
										</CtaButton>
									)
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
				id={buttonId}
				label={primaryButtonLabel}
				type="button"
				color={primaryButtonColor}
				size={buttonSize === "lg" ? "lg" : buttonSize === "sm" ? "sm" : "md"}
				className={buttonClassName}
				onClick={handleTriggerClick}
				disabled={disabled || !hasSessions}
			/>
			{modalContent}
			<AuthModal open={authOpen} mode={authMode} onOpenChange={setAuthOpen} onModeChange={setAuthMode} redirectTo={authRedirect ?? undefined} />
		</>
	);
}
