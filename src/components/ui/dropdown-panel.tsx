"use client";

import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DropdownPanelProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger: React.ReactNode;
	align?: "start" | "center" | "end";
	sideOffset?: number;
	className?: string;
	children: React.ReactNode;
};

export function DropdownPanel({ open, onOpenChange, trigger, align = "end", sideOffset = 8, className, children }: DropdownPanelProps): React.ReactElement {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent align={align} sideOffset={sideOffset} className={cn("w-72 p-0", className)}>
				{children}
			</PopoverContent>
		</Popover>
	);
}

type HeaderProps = {
	title?: React.ReactNode;
	right?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
};

export function DropdownPanelHeader({ title, right, children, className }: HeaderProps): React.ReactElement {
	return (
		<div className={cn("border-b border-border/60 px-4 py-3", className)}>
			{title || right ? (
				<div className="flex items-center justify-between gap-3 text-sm font-semibold">
					{title}
					{right}
				</div>
			) : null}
			{children ? <div className={cn(title || right ? "mt-2" : undefined)}>{children}</div> : null}
		</div>
	);
}

type SectionProps = {
	children: React.ReactNode;
	className?: string;
};

export function DropdownPanelContent({ children, className }: SectionProps): React.ReactElement {
	return <div className={cn("px-4 py-3", className)}>{children}</div>;
}

export function DropdownPanelFooter({ children, className }: SectionProps): React.ReactElement {
	return <div className={cn("border-t border-border/60 px-4 py-3", className)}>{children}</div>;
}
