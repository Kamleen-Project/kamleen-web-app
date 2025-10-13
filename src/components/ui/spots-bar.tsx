import * as React from "react";

type SpotsBarProps = {
	value: number; // confirmed or filled spots
	pending?: number; // pending spots to render in yellow
	max: number;
	className?: string;
	segmentClassName?: string;
	fillClassName?: string; // class for confirmed
	pendingFillClassName?: string; // class for pending
};

export function SpotsBar({ value, pending = 0, max, className, segmentClassName, fillClassName, pendingFillClassName }: SpotsBarProps) {
	const safeMax = Math.max(0, max);
	const clamped = safeMax > 0 ? Math.max(0, Math.min(value, safeMax)) : 0;
	const clampedPending = safeMax > 0 ? Math.max(0, Math.min(pending, safeMax - clamped)) : 0;

	if (safeMax <= 0) {
		return <div className={"h-2 w-full rounded-full bg-muted " + (className ?? "")} />;
	}

	const segments = Array.from({ length: safeMax }, (_, i) => i);

	return (
		<div
			className={"flex w-full items-center gap-1 " + (className ?? "")}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={safeMax}
			aria-valuenow={clamped + clampedPending}
		>
			{segments.map((index) => {
				const isConfirmed = index < clamped;
				const isPending = !isConfirmed && index < clamped + clampedPending;
				const fillClass = isConfirmed ? fillClassName ?? "bg-foreground" : isPending ? pendingFillClassName ?? "bg-amber-500" : null;
				return (
					<div key={index} className={"relative h-2 flex-1 overflow-hidden rounded-full bg-muted " + (segmentClassName ?? "")}>
						{fillClass ? <div className={"absolute inset-y-0 left-0 transition-[width] duration-200 " + fillClass} style={{ width: "100%" }} /> : null}
					</div>
				);
			})}
		</div>
	);
}
