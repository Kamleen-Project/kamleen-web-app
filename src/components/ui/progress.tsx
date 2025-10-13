import * as React from "react";

type ProgressProps = {
	value: number;
	max?: number;
	className?: string;
	barClassName?: string;
};

export function Progress({ value, max = 100, className, barClassName }: ProgressProps) {
	const clamped = Math.max(0, Math.min(max, value));
	const pct = max > 0 ? (clamped / max) * 100 : 0;
	return (
		<div
			className={"relative h-2 w-full overflow-hidden rounded-full bg-muted " + (className ?? "")}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={clamped}
		>
			<div className={"h-full bg-primary transition-[width] duration-300 " + (barClassName ?? "")} style={{ width: `${pct}%` }} />
		</div>
	);
}
