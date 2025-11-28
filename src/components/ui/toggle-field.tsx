"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleFieldProps = {
	label: React.ReactNode;
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	className?: string;
	containerClassName?: string;
};

export function ToggleField({ label, checked, onChange, disabled, className, containerClassName }: ToggleFieldProps) {
	return (
		<div className={cn("flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2", containerClassName)}>
			<div className={cn("text-sm text-muted-foreground mr-4", className)}>{label}</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked ? "true" : "false"}
				aria-disabled={disabled ? "true" : "false"}
				onClick={() => !disabled && onChange(!checked)}
				className={cn(
					"relative inline-flex h-6 w-11 items-center rounded-full transition",
					checked ? "bg-primary" : "bg-muted",
					disabled ? "opacity-50 cursor-not-allowed" : ""
				)}
			>
				<span className={cn("inline-block size-5 transform rounded-full bg-background shadow transition", checked ? "translate-x-5" : "translate-x-1")} />
			</button>
		</div>
	);
}

ToggleField.displayName = "ToggleField";

export type { ToggleFieldProps };
