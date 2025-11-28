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
};

export function ExperienceStickyHeader({
	title,
	triggerId,
	ctaTargetId,
	averageRating,
	reviewCount,
	experienceId,
	initialPendingReservation = null,
}: ExperienceStickyHeaderProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [pendingReservation, setPendingReservation] = useState(initialPendingReservation);
	const { formatted: countdownLabel, isExpired } = useCountdown(pendingReservation?.expiresAt ?? null, {
		onExpire: () => setPendingReservation(null),
	});
	const hasPendingReservation = !!pendingReservation && !isExpired;

	useEffect(() => {
		const target = document.getElementById(triggerId);

		if (!target) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsVisible(!entry.isIntersecting);
			},
			{
				root: null,
				threshold: 0,
				rootMargin: "-64px 0px 0px 0px",
			}
		);

		observer.observe(target);

		return () => observer.disconnect();
	}, [triggerId]);

	const handleReserveClick = useCallback(() => {
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
	}, [ctaTargetId]);

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
	const ctaLabel = hasPendingReservation ? `Complete your reservation${countdownLabel ? ` · ${countdownLabel}` : ""}` : "Reserve a spot";

	return (
		<div
			aria-hidden={!isVisible}
			className={cn(
				"sticky top-16 z-30 overflow-hidden border-b border-border/60 bg-black/95 text-white backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-black/80",
				isVisible ? "pointer-events-auto max-h-24 translate-y-0 opacity-100 shadow-sm" : "pointer-events-none max-h-0 -translate-y-2 opacity-0"
			)}
		>
			<Container className={cn("flex items-center justify-between gap-4", isVisible ? "py-3" : "py-0")}>
				<div className="min-w-0 flex-1">
					<h2 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h2>
					<ExperienceRating averageRating={averageRating} reviewCount={reviewCount} variant="sticky" className="mt-1" />
				</div>
				<CtaButton size="lg" color={hasPendingReservation ? "amber" : "white"} onClick={handleReserveClick}>
					{ctaLabel}
				</CtaButton>
			</Container>
		</div>
	);
}
