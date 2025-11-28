"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";
// export { Button, buttonVariants } from "@/components/ui/button";

type CtaButtonProps = {
	color?: "black" | "white" | "whiteBorder" | "primary" | "amber";
	size?: "sm" | "md" | "lg";
	label?: string;
	className?: string;
	onClick?: () => void;
	asChild?: boolean;
	children?: React.ReactNode;
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	id?: string;
	form?: string;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	isLoading?: boolean;
	title?: string;
};

const fontSizeMap = {
	sm: "text-sm",
	md: "text-sm",
	lg: "text-md",
} as const;

const sizeClass = {
	sm: "h-8 px-3",
	md: "h-9 px-4",
	lg: "h-10 px-6",
} as const;

const colorClass = {
	black: "bg-black text-white hover:bg-black/80 border border-transparent",
	white: "bg-white text-black hover:bg-zinc-100 border border-transparent",
	whiteBorder: "bg-white text-black hover:bg-zinc-100 border border-input",
	primary: "bg-brand text-brand-foreground hover:bg-brand/90 border border-transparent",
	amber: "bg-amber-400 text-black hover:bg-amber-300 border border-transparent",
} as const;

export function CtaButton({
	color = "black",
	size = "md",
	label,
	className,
	onClick,
	asChild,
	children,
	type = "button",
	disabled,
	id,
	form,
	startIcon,
	endIcon,
	isLoading,
	title,
}: CtaButtonProps) {
	const content = children ?? label ?? "Button";
	const classes = cn(
		"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
		colorClass[color],
		fontSizeMap[size],
		sizeClass[size],
		className
	);

	// When asChild is true, render a Slot so props/classNames are applied to the child element.
	if (asChild) {
		return (
			<Slot id={id} className={classes} onClick={onClick} title={title}>
				{children as React.ReactElement}
			</Slot>
		);
	}

	return (
		<button
			id={id}
			className={classes}
			onClick={onClick}
			type={type}
			disabled={Boolean(disabled || isLoading)}
			aria-busy={isLoading ? true : undefined}
			form={form}
			title={title}
		>
			{isLoading ? (
				<span className="-ml-0.5 inline-flex items-center">
					<Loader2 className="size-4 animate-spin" />
				</span>
			) : startIcon ? (
				<span className="-ml-0.5 inline-flex items-center">{startIcon}</span>
			) : null}
			<span>{content}</span>
			{endIcon ? <span className="-mr-0.5 inline-flex items-center">{endIcon}</span> : null}
		</button>
	);
}

export default CtaButton;
