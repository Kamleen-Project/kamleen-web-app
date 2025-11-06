"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

type TimeFieldProps = {
	value: string | undefined;
	onChange: (next: string) => void;
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	required?: boolean;
	containerClassName?: string;
	className?: string;
	hourStart?: number;
	hourEnd?: number;
	minuteStep?: number;
	disabled?: boolean;
	selectClassName?: string;
};

export function TimeField({
	value,
	onChange,
	label,
	caption,
	error,
	required,
	containerClassName,
	className,
	hourStart = 0,
	hourEnd = 23,
	minuteStep = 5,
	disabled,
	selectClassName,
}: TimeFieldProps) {
	const normalized = React.useMemo(() => {
		const fallback = "09:00";
		const raw = typeof value === "string" && value.trim() ? value : fallback;
		const [hRaw = "09", mRaw = "00"] = raw.split(":");
		const h = String(Math.max(0, Math.min(23, Number.parseInt(hRaw || "0", 10) || 0))).padStart(2, "0");
		const step = Math.max(1, Math.min(30, Math.floor(minuteStep)));
		const mNum = Number.parseInt(mRaw || "0", 10) || 0;
		const snapped = Math.max(0, Math.min(59, Math.round(mNum / step) * step));
		const m = String(snapped).padStart(2, "0");
		return { hours: h, minutes: m };
	}, [value, minuteStep]);

	const handleHours = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const h = String(Math.max(0, Math.min(23, Number.parseInt(e.target.value || "0", 10) || 0))).padStart(2, "0");
		onChange(`${h}:${normalized.minutes}`);
	};

	const handleMinutes = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const m = String(Math.max(0, Math.min(59, Number.parseInt(e.target.value || "0", 10) || 0))).padStart(2, "0");
		onChange(`${normalized.hours}:${m}`);
	};

	const hours: number[] = React.useMemo(() => {
		const start = Math.max(0, Math.min(23, Math.floor(hourStart)));
		const end = Math.max(start, Math.min(23, Math.floor(hourEnd)));
		const list: number[] = [];
		for (let h = start; h <= end; h++) list.push(h);
		return list;
	}, [hourStart, hourEnd]);

	const minutes: number[] = React.useMemo(() => {
		const step = Math.max(1, Math.min(30, Math.floor(minuteStep)));
		const list: number[] = [];
		for (let m = 0; m < 60; m += step) list.push(m);
		return list;
	}, [minuteStep]);

	const selectBaseClass =
		"flex h-11 w-24 appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

	const content = (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="relative">
				<select aria-label="Hours" className={cn(selectBaseClass, selectClassName)} value={normalized.hours} onChange={handleHours} disabled={disabled}>
					{hours.map((h) => {
						const hh = String(h).padStart(2, "0");
						return (
							<option key={hh} value={hh}>
								{hh}
							</option>
						);
					})}
				</select>
				<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			</div>
			<span className="text-muted-foreground">:</span>
			<div className="relative">
				<select aria-label="Minutes" className={cn(selectBaseClass, selectClassName)} value={normalized.minutes} onChange={handleMinutes} disabled={disabled}>
					{minutes.map((m) => {
						const mm = String(m).padStart(2, "0");
						return (
							<option key={mm} value={mm}>
								{mm}
							</option>
						);
					})}
				</select>
				<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			</div>
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

TimeField.displayName = "TimeField";

export type { TimeFieldProps };
