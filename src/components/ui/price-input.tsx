"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
import { Input } from "./input";

type PriceInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	currency?: string;
	containerClassName?: string;
	onValueChange?: (value: string) => void;
};

function sanitisePriceInput(raw: string): string {
	const onlyDigits = (raw || "").replace(/[^0-9]/g, "");
	if (!onlyDigits) return "";
	return String(parseInt(onlyDigits, 10));
}

export function PriceInput({
	label,
	caption,
	error,
	className,
	currency,
	onKeyDown,
	onChange,
	onBlur,
	onValueChange,
	containerClassName,
	...props
}: PriceInputProps) {
	const showRequiredStar = Boolean(props?.required) && Boolean(label);
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
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const blocked = ["e", "E", "+", "-", ".", ","];
		if (blocked.includes(e.key)) {
			e.preventDefault();
		}
		onKeyDown?.(e);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const next = sanitisePriceInput(e.target.value);
		onValueChange?.(next);
		onChange?.({ ...e, target: { ...e.target, value: next } } as React.ChangeEvent<HTMLInputElement>);
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const next = sanitisePriceInput(e.target.value);
		onValueChange?.(next);
		onBlur?.({ ...e, target: { ...e.target, value: next } } as React.FocusEvent<HTMLInputElement>);
	};

	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{labelContent ? <FormLabel>{labelContent}</FormLabel> : null}
				<FormControl>
					<div className="relative">
						<Input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							onKeyDown={handleKeyDown}
							onChange={handleChange}
							onBlur={handleBlur}
							className={cn("pr-16", className)}
							{...props}
						/>
						{currency ? (
							<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{currency}</span>
						) : null}
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

PriceInput.displayName = "PriceInput";

export type { PriceInputProps };
