"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

export type RadioOption = { label: React.ReactNode; value: string };

type RadioGroupFieldProps = {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	options: RadioOption[];
	className?: string;
	containerClassName?: string;
	required?: boolean;
};

export function RadioGroupField({ label, caption, error, name, value, onChange, options, className, containerClassName, required }: RadioGroupFieldProps) {
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
	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{labelContent ? <FormLabel>{labelContent}</FormLabel> : null}
				<FormControl>
					<div role="radiogroup" className={cn("flex flex-wrap gap-3", className)}>
						{options.map((opt) => (
							<label
								key={String(opt.value)}
								className={cn(
									"inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
									value === opt.value ? "border-primary bg-primary/5 text-foreground" : "border-input bg-background text-muted-foreground hover:bg-accent/30"
								)}
							>
								<input
									type="radio"
									name={name}
									value={opt.value}
									checked={value === opt.value}
									onChange={(e) => onChange(e.target.value)}
									className="accent-primary"
									required={Boolean(required)}
								/>
								{opt.label}
							</label>
						))}
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

RadioGroupField.displayName = "RadioGroupField";
