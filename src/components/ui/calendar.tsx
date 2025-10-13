"use client";

import * as React from "react";
import {
	addDays,
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isAfter,
	isBefore,
	isSameDay,
	isSameMonth,
	isWithinInterval,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalendarDateRange = {
	from?: Date;
	to?: Date;
};

type CalendarProps = {
	value: CalendarDateRange;
	onChange?: (value: CalendarDateRange) => void;
	monthCount?: number;
	minDate?: Date;
	maxDate?: Date;
	className?: string;
};

const WEEK_START = 0;

function createMonthMatrix(month: Date) {
	const start = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_START });
	const end = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_START });
	const days = eachDayOfInterval({ start, end });
	const rows: Date[][] = [];

	for (let index = 0; index < days.length; index += 7) {
		rows.push(days.slice(index, index + 7));
	}

	return rows;
}

function getWeekdayLabels() {
	const start = startOfWeek(startOfDay(new Date()), { weekStartsOn: WEEK_START });
	return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), "EEEEE"));
}

export function Calendar({ value, onChange, monthCount = 2, minDate, maxDate, className }: CalendarProps) {
	const today = React.useMemo(() => startOfDay(new Date()), []);
	const initialMonth = React.useMemo(
		() => startOfMonth(value.from ?? value.to ?? today),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
	const [currentMonth, setCurrentMonth] = React.useState(initialMonth);

	const months = React.useMemo(
		() => Array.from({ length: Math.max(1, monthCount) }, (_, index) => startOfMonth(addMonths(currentMonth, index))),
		[currentMonth, monthCount]
	);

	const weekdayLabels = React.useMemo(() => getWeekdayLabels(), []);

	const handlePrevMonth = () => {
		setCurrentMonth((previous) => startOfMonth(addMonths(previous, -1)));
	};

	const handleNextMonth = () => {
		setCurrentMonth((previous) => startOfMonth(addMonths(previous, 1)));
	};

	const handleDayClick = (day: Date) => {
		const isBeforeMin = minDate ? isBefore(day, minDate) : false;
		const isAfterMax = maxDate ? isAfter(day, maxDate) : false;

		if (isBeforeMin || isAfterMax) {
			return;
		}

		let next: CalendarDateRange;

		if (!value.from || (value.from && value.to)) {
			next = { from: day, to: undefined };
		} else if (isBefore(day, value.from)) {
			next = { from: day, to: undefined };
		} else {
			next = { from: value.from, to: day };
		}

		onChange?.(next);
	};

	return (
		<div className={cn("flex min-w-[280px] flex-col gap-4", className)}>
			<div className="flex items-center justify-end gap-2 px-1">
				<button
					type="button"
					onClick={handlePrevMonth}
					className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="Previous month"
				>
					<ChevronLeft className="size-4" />
				</button>
				<button
					type="button"
					onClick={handleNextMonth}
					className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="Next month"
				>
					<ChevronRight className="size-4" />
				</button>
			</div>
			<div className={cn("grid gap-4", months.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
				{months.map((month) => {
					const matrix = createMonthMatrix(month);

					return (
						<div key={month.toISOString()} className="space-y-3">
							<div className="flex items-center justify-center text-sm font-semibold text-foreground">{format(month, "LLLL yyyy")}</div>
							<div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground">
								{weekdayLabels.map((label, index) => (
									<span key={`${label}-${index}`} className="text-center">
										{label}
									</span>
								))}
							</div>
							<div className="grid grid-cols-7 gap-1 text-sm">
								{matrix.map((week, weekIndex) => (
									<React.Fragment key={`week-${weekIndex}`}>
										{week.map((day) => {
											const isOutsideMonth = !isSameMonth(day, month);
											const isStart = value.from ? isSameDay(day, value.from) : false;
											const isEnd = value.to ? isSameDay(day, value.to) : false;
											const isBetween = value.from && value.to ? isWithinInterval(day, { start: value.from, end: value.to }) && !isStart && !isEnd : false;
											const isToday = isSameDay(day, today);
											const isBeforeMin = minDate ? isBefore(day, minDate) : false;
											const isAfterMax = maxDate ? isAfter(day, maxDate) : false;
											const disabled = isBeforeMin || isAfterMax;

											return (
												<button
													key={day.toISOString()}
													type="button"
													onClick={() => handleDayClick(day)}
													disabled={disabled}
													className={cn(
														"inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
														isOutsideMonth && "text-muted-foreground/40",
														disabled && "cursor-not-allowed text-muted-foreground/30",
														!disabled && !isStart && !isEnd && !isBetween && "hover:bg-muted hover:text-foreground",
														isStart && "bg-primary text-primary-foreground",
														isEnd && "bg-primary text-primary-foreground",
														isBetween && "bg-primary/10 text-primary",
														isToday && "border border-primary/40"
													)}
													aria-pressed={isStart || isEnd}
												>
													{format(day, "d")}
												</button>
											);
										})}
									</React.Fragment>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

Calendar.displayName = "Calendar";
