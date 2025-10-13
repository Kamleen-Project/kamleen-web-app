"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
import { Textarea, type TextareaProps } from "./textarea";

type TextareaFieldProps = TextareaProps & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
};

export function TextareaField({ label, caption, error, className, containerClassName, ...props }: TextareaFieldProps) {
	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{label ? <FormLabel>{label}</FormLabel> : null}
				<FormControl>
					<Textarea className={className} {...props} />
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

TextareaField.displayName = "TextareaField";

export type { TextareaFieldProps };
