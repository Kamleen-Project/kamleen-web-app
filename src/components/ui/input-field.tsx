"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
import { Input } from "./input";

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
};

export function InputField({ label, caption, error, className, containerClassName, ...props }: InputFieldProps) {
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
					<Input className={className} {...props} />
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

InputField.displayName = "InputField";

export type { InputFieldProps };
