"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

type Option = { label: React.ReactNode; value: string; disabled?: boolean };

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	options?: Option[];
	containerClassName?: string;
};

export function SelectField({ label, caption, error, className, options, children, containerClassName, ...props }: SelectFieldProps) {
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
	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{labelContent ? <FormLabel>{labelContent}</FormLabel> : null}
				<FormControl>
					<div className="relative">
						<select
							className={cn(
								"flex h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
								className
							)}
							{...props}
						>
							{options
								? options.map((opt) => (
										<option key={String(opt.value)} value={String(opt.value)} disabled={Boolean(opt.disabled)}>
											{opt.label}
										</option>
								  ))
								: children}
						</select>
						<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

SelectField.displayName = "SelectField";

export type { SelectFieldProps, Option as SelectOption };
