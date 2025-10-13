"use client";

import * as React from "react";

type DurationValue = {
	days: string;
	hours: string;
	minutes: string;
};

type DurationSelectorProps = {
	value: DurationValue;
	onChange: (next: DurationValue) => void;
	daysEnabled?: boolean;
	hoursEnabled?: boolean;
	minutesEnabled?: boolean;
	maxDays?: number;
	maxHours?: number;
	minuteStep?: number;
	className?: string;
};

export function DurationSelector({
	value,
	onChange,
	daysEnabled = true,
	hoursEnabled = true,
	minutesEnabled = true,
	maxDays = 7,
	maxHours = 23,
	minuteStep = 5,
	className,
}: DurationSelectorProps) {
	const handleDays = (e: React.ChangeEvent<HTMLSelectElement>) => {
		onChange({ days: e.target.value, hours: value.hours, minutes: value.minutes });
	};
	const handleHours = (e: React.ChangeEvent<HTMLSelectElement>) => {
		onChange({ days: value.days, hours: e.target.value, minutes: value.minutes });
	};
	const handleMinutes = (e: React.ChangeEvent<HTMLSelectElement>) => {
		onChange({ days: value.days, hours: value.hours, minutes: e.target.value });
	};

	const minutesOptions: number[] = React.useMemo(() => {
		const step = Math.max(1, Math.min(30, Math.floor(minuteStep)));
		const list: number[] = [];
		for (let m = 0; m < 60; m += step) list.push(m);
		return list;
	}, [minuteStep]);

	return (
		<div className={"grid gap-2 sm:grid-cols-3 " + (className ?? "")}>
			{daysEnabled ? (
				<div>
					<select
						className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
						value={value.days}
						onChange={handleDays}
					>
						{Array.from({ length: maxDays + 1 }).map((_, i) => (
							<option key={i} value={String(i)}>
								{i} day{i === 1 ? "" : "s"}
							</option>
						))}
					</select>
				</div>
			) : null}
			{hoursEnabled ? (
				<div>
					<select
						className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
						value={value.hours}
						onChange={handleHours}
					>
						{Array.from({ length: maxHours + 1 }).map((_, i) => (
							<option key={i} value={String(i)}>
								{i} hour{i === 1 ? "" : "s"}
							</option>
						))}
					</select>
				</div>
			) : null}
			{minutesEnabled ? (
				<div>
					<select
						className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring"
						value={value.minutes}
						onChange={handleMinutes}
					>
						{minutesOptions.map((m) => (
							<option key={m} value={String(m)}>
								{m} min
							</option>
						))}
					</select>
				</div>
			) : null}
		</div>
	);
}
