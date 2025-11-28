import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	value: string;
	variation?: "success" | "warning" | "danger" | "muted" | "outline" | "soft" | "info" | "primary";
}

function getAppearanceClass(variation: StatusBadgeProps["variation"]): string | undefined {
	if (variation === "primary") return "bg-white border-border text-brand border-brand";
	if (variation === "success") return "bg-emerald-600 text-white border-transparent";
	if (variation === "warning") return "bg-amber-500 text-white border-transparent";
	if (variation === "danger") return "bg-rose-600 text-white border-transparent";
	if (variation === "muted") return "bg-slate-500 text-white border-transparent";
	if (variation === "info") return "bg-sky-600 text-white border-transparent";
	if (variation === "soft") return "border-transparent bg-primary/10 text-primary";
	if (variation === "outline") return "border-border text-foreground";
	return undefined;
}

export function StatusBadge({ value, variation, className, ...props }: StatusBadgeProps) {
	const baseClasses = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide";
	const defaultVariantClass = "border-transparent bg-primary text-primary-foreground";
	const appearanceClass = getAppearanceClass(variation);
	return (
		<span className={cn(baseClasses, appearanceClass ?? defaultVariantClass, "text-nowrap globals-loaded-check", className)} {...props}>
			{value}
		</span>
	);
}
