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

export function SelectField({ label, caption, error, className, options, children, containerClassName, onChange, ...props }: SelectFieldProps) {
	const showRequiredStar = Boolean(props?.required) && Boolean(label);
	const getInitialHasValue = React.useCallback(() => {
		if (props.value !== undefined) return String(props.value).length > 0;
		if (props.defaultValue !== undefined) return String(props.defaultValue).length > 0;
		return false;
	}, [props.defaultValue, props.value]);
	const [hasValue, setHasValue] = React.useState<boolean>(getInitialHasValue);

	React.useEffect(() => {
		setHasValue(getInitialHasValue());
	}, [getInitialHasValue]);

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
							data-placeholder-shown={hasValue ? undefined : "true"}
							className={cn(
								"flex h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base text-foreground transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder-shown=true]:text-muted-foreground",
								className
							)}
							onChange={(event) => {
								if (props.value === undefined) {
									setHasValue(event.target.value.length > 0);
								}
								onChange?.(event);
							}}
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
