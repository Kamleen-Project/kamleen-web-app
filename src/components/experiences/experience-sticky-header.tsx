"use client";

import { useCallback, useEffect, useState } from "react";

import { Container } from "@/components/layout/container";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";

import { useCountdown } from "@/hooks/use-countdown";
import { EXPERIENCE_RESERVATION_STATUS_EVENT, type ReservationStatusDetail } from "@/lib/events/reservations";
import { ExperienceRating } from "@/components/experiences/experience-rating";

type ExperienceStickyHeaderProps = {
	title: string;
	triggerId: string;
	ctaTargetId?: string;
	averageRating: number;
	reviewCount: number;
	experienceId: string;
	initialPendingReservation?: { expiresAt: string | null } | null;
	reservationStatus?: "OPEN" | "COMING_SOON" | "CLOSED";
};

export function ExperienceStickyHeader({
	title,
	triggerId,
	ctaTargetId,
	averageRating,
	reviewCount,
	experienceId,
	initialPendingReservation = null,
	reservationStatus = "OPEN",
}: ExperienceStickyHeaderProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [pendingReservation, setPendingReservation] = useState(initialPendingReservation);
	const { formatted: countdownLabel, isExpired } = useCountdown(pendingReservation?.expiresAt ?? null, {
		onExpire: () => setPendingReservation(null),
	});
	const hasPendingReservation = !!pendingReservation && !isExpired;

	useEffect(() => {
		const target = document.getElementById(triggerId);
		if (!target) return;

		const TRIGGER_OFFSET = 64; // Matches the rootMargin top offset

		const handleScroll = () => {
			if (!target) return;
			const rect = target.getBoundingClientRect();
			// Show sticky header when the bottom of the trigger element passes the top threshold
			// This matches the previous IntersectionObserver logic but is more robust on iOS scroll
			const shouldBeVisible = rect.bottom < TRIGGER_OFFSET;
			setIsVisible(shouldBeVisible);
		};

		// Check initially
		handleScroll();

		// Use passive scroll listener for performance
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [triggerId]);

	const handleReserveClick = useCallback(() => {
		if (reservationStatus !== "OPEN" && !hasPendingReservation) {
			return;
		}

		if (!ctaTargetId) {
			return;
		}

		const targetButton = document.getElementById(ctaTargetId);
		if (targetButton) {
			(targetButton as HTMLElement).click();
			return;
		}

		// Fallback: dispatch a custom event consumed by the reservation modal
		window.dispatchEvent(new Event("open-experience-reservation"));

		const reserveSection = document.querySelector<HTMLElement>(`[data-reserve-target="${ctaTargetId}"]`);
		if (reserveSection) {
			reserveSection.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}

		const fallbackElement = document.getElementById(ctaTargetId);
		if (fallbackElement) {
			fallbackElement.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [ctaTargetId, reservationStatus, hasPendingReservation]);

	useEffect(() => {
		const handler = (event: Event) => {
			const detail = (event as CustomEvent<ReservationStatusDetail>).detail;
			if (!detail || detail.experienceId !== experienceId) {
				return;
			}
			if (detail.bookingId && detail.expiresAt) {
				setPendingReservation({ expiresAt: detail.expiresAt });
			} else {
				setPendingReservation(null);
			}
		};
		window.addEventListener(EXPERIENCE_RESERVATION_STATUS_EVENT, handler);
		return () => window.removeEventListener(EXPERIENCE_RESERVATION_STATUS_EVENT, handler);
	}, [experienceId]);

	const hasReviews = reviewCount > 0;

	let ctaLabel = "Reserve a spot";
	if (hasPendingReservation) {
		ctaLabel = `Complete your reservation${countdownLabel ? ` · ${countdownLabel}` : ""}`;
	} else if (reservationStatus === "COMING_SOON") {
		ctaLabel = "Coming Soon";
	} else if (reservationStatus === "CLOSED") {
		ctaLabel = "Closed";
	}

	const isDisabled = !hasPendingReservation && reservationStatus !== "OPEN";

	return (
		<div className="sticky top-16 z-30 h-0 w-full overflow-visible">
			<div
				aria-hidden={!isVisible}
				className={cn(
					"absolute top-0 left-0 right-0 border-b border-border/60 bg-black/95 text-white backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-black/80",
					isVisible ? "pointer-events-auto translate-y-0 opacity-100 shadow-sm" : "pointer-events-none -translate-y-2 opacity-0"
				)}
			>
				<Container className="flex items-center justify-between gap-4 py-3">
					<div className="min-w-0 flex-1">
						<h2 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h2>
						<ExperienceRating averageRating={averageRating} reviewCount={reviewCount} variant="sticky" className="mt-1" />
					</div>
					<CtaButton
						size="lg"
						color={hasPendingReservation ? "amber" : "white"}
						onClick={handleReserveClick}
						disabled={isDisabled}
					>
						{ctaLabel}
					</CtaButton>
				</Container>
			</div>
		</div>
	);
}
