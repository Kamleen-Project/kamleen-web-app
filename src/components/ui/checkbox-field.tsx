"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

type CheckboxFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
};

export function CheckboxField({ label, caption, error, className, containerClassName, id, ...props }: CheckboxFieldProps) {
	const inputId = React.useId();
	const resolvedId = id ?? inputId;
	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				<FormControl>
					<label htmlFor={resolvedId} className={cn("flex items-center gap-2 cursor-pointer select-none", className)}>
						<input id={resolvedId} type="checkbox" className="size-4 accent-primary rounded border-input" {...props} />
						{label ? (
							<FormLabel className="!mb-0" htmlFor={resolvedId}>
								{label}
							</FormLabel>
						) : null}
					</label>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

CheckboxField.displayName = "CheckboxField";

export type { CheckboxFieldProps };
