"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";

export function OpenReservationButton({ targetButtonId, className }: { targetButtonId: string; className?: string }) {
	const handleClick = useCallback(() => {
		const target = document.getElementById(targetButtonId) as HTMLButtonElement | null;
		if (target && !target.disabled) {
			target.click();
		}
	}, [targetButtonId]);

	return (
		<Button type="button" onClick={handleClick} className={className} variant="outline">
			Show all sessions
		</Button>
	);
}
