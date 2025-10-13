"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
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
	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{label ? <FormLabel>{label}</FormLabel> : null}
				<FormControl>
					<select
						className={cn(
							"h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring",
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
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

SelectField.displayName = "SelectField";

export type { SelectFieldProps, Option as SelectOption };
