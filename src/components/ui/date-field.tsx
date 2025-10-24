"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { Input } from "./input";

type DateFieldProps = {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
	name?: string; // when provided, a hidden yyyy-MM-dd input will be included
	id?: string;
	value?: Date | undefined;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	monthCount?: number;
	minDate?: Date;
	maxDate?: Date;
	buttonClassName?: string;
	allowTextInput?: boolean;
	required?: boolean;
};

export function DateField({
	label,
	caption,
	error,
	containerClassName,
	name,
	id,
	value,
	onChange,
	placeholder = "Pick a date",
	disabled,
	monthCount = 1,
	minDate,
	maxDate,
	buttonClassName,
	allowTextInput = true,
	required,
}: DateFieldProps) {
	const [open, setOpen] = React.useState(false);
	const formatted = value ? format(value, "yyyy-MM-dd") : "";
	const labelText = value ? format(value, "LLL dd, yyyy") : placeholder;
	const [text, setText] = React.useState<string>(formatted);

	React.useEffect(() => {
		setText(formatted);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formatted]);

	function tryCommitText(next: string) {
		const trimmed = next.trim();
		if (!trimmed) {
			onChange?.(undefined);
			return;
		}
		const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
		if (!isNaN(parsed.getTime())) {
			onChange?.(parsed);
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
						{typeof name === "string" ? <input type="hidden" name={name} value={formatted} readOnly /> : null}
						{allowTextInput ? (
							<div className="relative">
								<Input
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
									className="pr-10 h-11"
									required={Boolean(required)}
								/>

								<Popover open={open} onOpenChange={setOpen}>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
											disabled={disabled}
											aria-label="Open date picker"
										>
											<CalendarIcon className="size-4" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
										<Calendar
											value={{ from: value, to: value }}
											onChange={(range) => {
												const next = range?.from;
												onChange?.(next);
												if (next) setOpen(false);
											}}
											monthCount={monthCount}
											minDate={minDate}
											maxDate={maxDate}
										/>
									</PopoverContent>
								</Popover>
							</div>
						) : (
							<Popover open={open} onOpenChange={setOpen}>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="outline"
										className={cn("h-11 justify-start gap-2 text-left font-normal", !value && "text-muted-foreground", buttonClassName)}
										disabled={disabled}
									>
										<CalendarIcon className="size-4" />
										{labelText}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
									<Calendar
										value={{ from: value, to: value }}
										onChange={(range) => {
											const next = range?.from;
											onChange?.(next);
											if (next) setOpen(false);
										}}
										monthCount={monthCount}
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
