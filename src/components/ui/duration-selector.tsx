"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

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
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
	required?: boolean;
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
	label,
	caption,
	error,
	containerClassName,
	required,
}: DurationSelectorProps) {
	const selectClass =
		"h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";
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

	const content = (
		<div className={"grid gap-2 sm:grid-cols-3 " + (className ?? "")}>
			{daysEnabled ? (
				<div className="relative">
					<select className={selectClass} value={value.days} onChange={handleDays}>
						{Array.from({ length: maxDays + 1 }).map((_, i) => (
							<option key={i} value={String(i)}>
								{i} day{i === 1 ? "" : "s"}
							</option>
						))}
					</select>
					<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				</div>
			) : null}
			{hoursEnabled ? (
				<div className="relative">
					<select className={selectClass} value={value.hours} onChange={handleHours}>
						{Array.from({ length: maxHours + 1 }).map((_, i) => (
							<option key={i} value={String(i)}>
								{i} hour{i === 1 ? "" : "s"}
							</option>
						))}
					</select>
					<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				</div>
			) : null}
			{minutesEnabled ? (
				<div className="relative">
					<select className={selectClass} value={value.minutes} onChange={handleMinutes}>
						{minutesOptions.map((m) => (
							<option key={m} value={String(m)}>
								{m} min
							</option>
						))}
					</select>
					<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				</div>
			) : null}
		</div>
	);

	const showRequiredStar = Boolean(required) && Boolean(label);
	const labelContent = label ? (
		<span className="inline-flex items-center gap-1">
			{label}
			{showRequiredStar ? (
				<span className="text-destructive" aria-hidden="true">
					*
				</span>
			) : null}
		</span>
	) : null;

	if (label || caption || error) {
		return (
			<div className={cn("space-y-2", containerClassName)}>
				<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
					{labelContent ? <FormLabel>{labelContent}</FormLabel> : null}
					<FormControl>{content}</FormControl>
					{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
					<FormMessage />
				</FormField>
			</div>
		);
	}
	return content;
}
