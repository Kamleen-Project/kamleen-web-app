"use client";

import { useCallback } from "react";

import { CtaButton } from "@/components/ui/cta-button";

export function OpenReservationButton({ targetButtonId, className }: { targetButtonId: string; className?: string }) {
	const handleClick = useCallback(() => {
		const target = document.getElementById(targetButtonId) as HTMLElement | null;
		if (target) {
			target.click();
			return;
		}
		// Fallback: dispatch event consumed by ExperienceReservationModal
		window.dispatchEvent(new Event("open-experience-reservation"));
	}, [targetButtonId]);

	return (
		<CtaButton type="button" onClick={handleClick} className={className} color="whiteBorder">
			Show all sessions
		</CtaButton>
	);
}
