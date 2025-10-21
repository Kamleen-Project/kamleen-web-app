"use client";

import { useCallback, useEffect, useState } from "react";

import { Container } from "@/components/layout/container";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type ExperienceStickyHeaderProps = {
	title: string;
	triggerId: string;
	ctaTargetId?: string;
	averageRating: number;
	reviewCount: number;
};

export function ExperienceStickyHeader({ title, triggerId, ctaTargetId, averageRating, reviewCount }: ExperienceStickyHeaderProps) {
	const [isVisible, setIsVisible] = useState(false);

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

	const hasReviews = reviewCount > 0;

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
					<div className="mt-1 flex items-center gap-2 text-xs text-white/80">
						<span className="inline-flex items-center gap-1">
							<Star className={cn("size-4", hasReviews ? "text-amber-400" : "text-white/40")} aria-hidden="true" />
							<span className="font-medium text-white">{hasReviews ? averageRating.toFixed(2) : "No reviews yet"}</span>
						</span>
						{hasReviews ? (
							<span>
								{reviewCount} review{reviewCount === 1 ? "" : "s"}
							</span>
						) : null}
					</div>
				</div>
				<CtaButton size="lg" color="white" onClick={handleReserveClick}>
					Reserve a spot
				</CtaButton>
			</Container>
		</div>
	);
}
