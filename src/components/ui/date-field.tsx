"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
// import { Button } from "./button";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { CtaButton } from "@/components/ui/cta-button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar, type CalendarDateRange } from "./calendar";
// using native input instead of the shared Input component for this field

type DateFieldProps = {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
	name?: string; // when provided and range=false, a hidden yyyy-MM-dd input will be included
	nameStart?: string; // when provided and range=true, include hidden yyyy-MM-dd for start
	nameEnd?: string; // when provided and range=true, include hidden yyyy-MM-dd for end
	id?: string;
	value?: Date | undefined; // used when range=false
	valueRange?: CalendarDateRange | undefined; // used when range=true
	onChange?: (date: Date | undefined) => void; // used when range=false
	onChangeRange?: (range: CalendarDateRange | undefined) => void; // used when range=true
	placeholder?: string;
	disabled?: boolean;
	monthCount?: number; // defaults to 1 for single, 2 for range
	minDate?: Date;
	maxDate?: Date;
	buttonClassName?: string;
	allowTextInput?: boolean;
	required?: boolean;
	range?: boolean;
};

export function DateField({
	label,
	caption,
	error,
	containerClassName,
	name,
	nameStart,
	nameEnd,
	id,
	value,
	valueRange,
	onChange,
	onChangeRange,
	placeholder = "Pick a date",
	disabled,
	monthCount,
	minDate,
	maxDate,
	buttonClassName,
	allowTextInput = true,
	required,
	range = false,
}: DateFieldProps) {
	const [open, setOpen] = React.useState(false);
	const singleFormatted = value ? format(value, "yyyy-MM-dd") : "";
	const rangeFormattedStart = valueRange?.from ? format(valueRange.from, "yyyy-MM-dd") : "";
	const rangeFormattedEnd = valueRange?.to ? format(valueRange.to, "yyyy-MM-dd") : "";

	const labelText = range
		? valueRange?.from
			? valueRange.to
				? `${format(valueRange.from, "LLL dd, yyyy")} – ${format(valueRange.to, "LLL dd, yyyy")}`
				: format(valueRange.from, "LLL dd, yyyy")
			: placeholder
		: value
		? format(value, "LLL dd, yyyy")
		: placeholder;

	const [text, setText] = React.useState<string>(singleFormatted);

	React.useEffect(() => {
		if (!range) setText(singleFormatted);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [singleFormatted, range]);

	function tryCommitText(next: string) {
		const trimmed = next.trim();
		if (!trimmed) {
			if (!range) onChange?.(undefined);
			return;
		}
		if (!range) {
			const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
			if (!isNaN(parsed.getTime())) {
				onChange?.(parsed);
			}
		}
	}

	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{label ? (
					<FormLabel>
						<span className="inline-flex items-center gap-1">
							{label}
							{required ? (
								<span className="text-destructive" aria-hidden="true">
									*
								</span>
							) : null}
						</span>
					</FormLabel>
				) : null}
				<FormControl>
					<div>
						{!range && typeof name === "string" ? <input type="hidden" name={name} value={singleFormatted} readOnly /> : null}
						{range && (nameStart || nameEnd) ? (
							<>
								{typeof nameStart === "string" ? <input type="hidden" name={nameStart} value={rangeFormattedStart} readOnly /> : null}
								{typeof nameEnd === "string" ? <input type="hidden" name={nameEnd} value={rangeFormattedEnd} readOnly /> : null}
							</>
						) : null}
						{allowTextInput ? (
							<div className="relative">
								<input
									id={id}
									placeholder={placeholder}
									value={text}
									onChange={(e) => setText(e.target.value)}
									onBlur={() => tryCommitText(text)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											tryCommitText(text);
										}
									}}
									disabled={disabled}
									className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring pr-10"
									required={Boolean(required)}
								/>

								<Popover open={open} onOpenChange={setOpen}>
									<PopoverTrigger asChild>
										<CtaIconButton
											type="button"
											size="lg"
											color="white"
											className="absolute right-1.5 top-1/2 -translate-y-1/2"
											disabled={disabled}
											ariaLabel="Open date picker"
										>
											<CalendarIcon className="size-4" />
										</CtaIconButton>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-2" align="end" sideOffset={8}>
										<Calendar
											value={range ? valueRange ?? {} : { from: value, to: value }}
											onChange={(selected) => {
												if (range) {
													onChangeRange?.(selected);
													if (selected?.from && selected?.to) setOpen(false);
												} else {
													const next = selected?.from;
													onChange?.(next);
													if (next) setOpen(false);
												}
											}}
											monthCount={monthCount ?? (range ? 2 : 1)}
											minDate={minDate}
											maxDate={maxDate}
										/>
									</PopoverContent>
								</Popover>
							</div>
						) : (
							<Popover open={open} onOpenChange={setOpen}>
								<PopoverTrigger asChild>
									<button
										type="button"
										disabled={disabled}
										className={cn(
											"inline-flex w-full items-center justify-start gap-2 whitespace-nowrap rounded-lg font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
											"bg-white text-black hover:bg-zinc-100 border border-input",
											"text-sm h-11 px-4",
											"justify-start text-left font-normal",
											!value && "text-muted-foreground",
											buttonClassName
										)}
									>
										<CalendarIcon className="size-4" />
										{labelText}
									</button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
									<Calendar
										value={range ? valueRange ?? {} : { from: value, to: value }}
										onChange={(selected) => {
											if (range) {
												onChangeRange?.(selected);
												if (selected?.from && selected?.to) setOpen(false);
											} else {
												const next = selected?.from;
												onChange?.(next);
												if (next) setOpen(false);
											}
										}}
										monthCount={monthCount ?? (range ? 2 : 1)}
										minDate={minDate}
										maxDate={maxDate}
									/>
								</PopoverContent>
							</Popover>
						)}
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

DateField.displayName = "DateField";

export type { DateFieldProps };
