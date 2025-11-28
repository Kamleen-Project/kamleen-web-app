"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

type TextareaFieldProps = TextareaProps & {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	containerClassName?: string;
	showCounter?: boolean;
};

export function TextareaField({ label, caption, error, className, containerClassName, showCounter, ...props }: TextareaFieldProps) {
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

	const [counter, setCounter] = React.useState<number>(() => {
		if (typeof props.value === "string") return props.value.length;
		if (typeof props.defaultValue === "string") return props.defaultValue.length;
		return 0;
	});

	React.useEffect(() => {
		if (typeof props.value === "string") {
			setCounter(props.value.length);
		}
	}, [props.value]);

	const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
		if (showCounter) setCounter(event.target.value.length);
		props.onChange?.(event);
	};
	return (
		<div className={cn("space-y-2 ", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{labelContent ? <FormLabel>{labelContent}</FormLabel> : null}
				<FormControl>
					<textarea
						className={cn(
							"block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
							className
						)}
						onChange={handleChange}
						{...props}
					/>
				</FormControl>
				{caption || showCounter ? (
					<div className="flex flex-row items-center justify-between">
						{caption && typeof caption === "string" ? <FormDescription className="m-0">{caption}</FormDescription> : caption}
						{showCounter && typeof props.maxLength === "number" ? (
							<span className="text-right text-xs text-muted-foreground">
								{counter}/{props.maxLength}
							</span>
						) : null}
					</div>
				) : null}
				<FormMessage />
			</FormField>
		</div>
	);
}

TextareaField.displayName = "TextareaField";

export type { TextareaFieldProps };
