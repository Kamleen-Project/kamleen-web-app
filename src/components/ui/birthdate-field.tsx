"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

type BirthdateFieldProps = {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
	name?: string; // when provided, a hidden yyyy-MM-dd input will be included
	id?: string;
	value?: Date | undefined;
	onChange?: (date: Date | undefined) => void;
	disabled?: boolean;
	required?: boolean;
	yearStart?: number; // inclusive
	yearEnd?: number; // inclusive
};

function getDaysInMonth(year: number, month1To12: number): number {
	if (!year || !month1To12) return 31;
	return new Date(year, month1To12, 0).getDate();
}

const MONTHS: { value: string; label: string }[] = [
	{ value: "1", label: "January" },
	{ value: "2", label: "February" },
	{ value: "3", label: "March" },
	{ value: "4", label: "April" },
	{ value: "5", label: "May" },
	{ value: "6", label: "June" },
	{ value: "7", label: "July" },
	{ value: "8", label: "August" },
	{ value: "9", label: "September" },
	{ value: "10", label: "October" },
	{ value: "11", label: "November" },
	{ value: "12", label: "December" },
];

export function BirthdateField({
	label,
	caption,
	error,
	containerClassName,
	name,
	id,
	value,
	onChange,
	disabled,
	required,
	yearStart,
	yearEnd,
}: BirthdateFieldProps) {
	const now = React.useMemo(() => new Date(), []);
	const defaultYearEnd = React.useMemo(() => now.getFullYear(), [now]);
	const defaultYearStart = 1900;
	const yStart = typeof yearStart === "number" ? yearStart : defaultYearStart;
	const yEnd = typeof yearEnd === "number" ? yearEnd : defaultYearEnd;

	const [year, setYear] = React.useState<string>(value ? String(value.getFullYear()) : "");
	const [month, setMonth] = React.useState<string>(value ? String(value.getMonth() + 1) : "");
	const [day, setDay] = React.useState<string>(value ? String(value.getDate()) : "");
	const lastEmittedRef = React.useRef<string>(value ? String(value.getTime()) : "");

	React.useEffect(() => {
		if (!value) {
			// Reset only if not already empty to avoid loops
			if (year !== "" || month !== "" || day !== "") {
				setYear("");
				setMonth("");
				setDay("");
			}
			lastEmittedRef.current = "";
			return;
		}
		const y = value.getFullYear();
		const m = value.getMonth() + 1;
		const d = value.getDate();
		const yStr = String(y);
		const mStr = String(m);
		const dStr = String(d);
		if (year !== yStr) setYear(yStr);
		if (month !== mStr) setMonth(mStr);
		if (day !== dStr) setDay(dStr);
		// Sync last emitted to prop to prevent immediate feedback loop
		lastEmittedRef.current = String(value.getTime());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value?.getTime?.()]);

	const daysInCurrentMonth = React.useMemo(() => {
		const yNum = Number(year);
		const mNum = Number(month);
		if (!yNum || !mNum) return 31;
		return getDaysInMonth(yNum, mNum);
	}, [year, month]);

	React.useEffect(() => {
		const yNum = Number(year);
		const mNum = Number(month);
		const dNum = Number(day);
		if (yNum && mNum) {
			// Clamp day to the month's maximum before emitting to avoid Date overflow
			const max = getDaysInMonth(yNum, mNum);
			if (dNum && dNum > max) {
				const clamped = String(max);
				if (day !== clamped) {
					setDay(clamped);
				}
				return; // wait for next effect run after clamping
			}
			if (dNum) {
				const dt = new Date(yNum, mNum - 1, dNum);
				if (!isNaN(dt.getTime())) {
					const nextKey = String(dt.getTime());
					if (lastEmittedRef.current !== nextKey) {
						lastEmittedRef.current = nextKey;
						onChange?.(dt);
					}
					return;
				}
			}
		}
		if (lastEmittedRef.current !== "") {
			lastEmittedRef.current = "";
			onChange?.(undefined);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [year, month, day]);

	const formatted = React.useMemo(() => {
		const yNum = Number(year);
		const mNum = Number(month);
		const dNum = Number(day);
		if (!yNum || !mNum || !dNum) return "";
		const mm = String(mNum).padStart(2, "0");
		const dd = String(dNum).padStart(2, "0");
		return `${yNum}-${mm}-${dd}`;
	}, [year, month, day]);

	const selectClass =
		"h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

	const showRequiredStar = Boolean(required) && Boolean(label);

	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{label ? (
					<FormLabel>
						<span className="inline-flex items-center gap-1">
							{label}
							{showRequiredStar ? (
								<span className="text-destructive" aria-hidden="true">
									*
								</span>
							) : null}
						</span>
					</FormLabel>
				) : null}
				<FormControl>
					<div id={id} className="grid grid-cols-3 gap-2">
						{typeof name === "string" ? <input type="hidden" name={name} value={formatted} readOnly /> : null}
						<div className="relative">
							<select
								aria-label="Year"
								className={selectClass}
								value={year}
								onChange={(e) => setYear(e.target.value)}
								disabled={disabled}
								required={Boolean(required)}
							>
								<option value="" disabled>
									Year
								</option>
								{Array.from({ length: Math.max(0, yEnd - yStart + 1) }, (_, idx) => yEnd - idx).map((y) => (
									<option key={y} value={String(y)}>
										{y}
									</option>
								))}
							</select>
							<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						</div>
						<div className="relative">
							<select
								aria-label="Month"
								className={selectClass}
								value={month}
								onChange={(e) => setMonth(e.target.value)}
								disabled={disabled}
								required={Boolean(required)}
							>
								<option value="" disabled>
									Month
								</option>
								{MONTHS.map((m) => (
									<option key={m.value} value={m.value}>
										{m.label}
									</option>
								))}
							</select>
							<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						</div>
						<div className="relative">
							<select
								aria-label="Day"
								className={selectClass}
								value={day}
								onChange={(e) => setDay(e.target.value)}
								disabled={disabled}
								required={Boolean(required)}
							>
								<option value="" disabled>
									Day
								</option>
								{Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((d) => (
									<option key={d} value={String(d)}>
										{d}
									</option>
								))}
							</select>
							<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						</div>
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

BirthdateField.displayName = "BirthdateField";

export type { BirthdateFieldProps };
