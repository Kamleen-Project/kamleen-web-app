"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaButtonProps = {
	color?: "black" | "white" | "whiteBorder";
	size?: "sm" | "md" | "lg";
	label?: string;
	className?: string;
	onClick?: () => void;
	asChild?: boolean;
	children?: React.ReactNode;
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	id?: string;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
};

const sizeMap = {
	sm: "sm",
	md: "default",
	lg: "lg",
} as const;

const fontSizeMap = {
	sm: "text-sm",
	md: "text-sm",
	lg: "text-md",
} as const;

const colorClass = {
	black: "bg-black text-white hover:bg-black/80 border border-transparent",
	white: "bg-white text-black hover:bg-zinc-100 border border-transparent",
	whiteBorder: "bg-white text-black hover:bg-zinc-100 border border-input",
};

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
	startIcon,
	endIcon,
}: CtaButtonProps) {
	const content = children ?? label ?? "Button";

	return (
		<Button
			id={id}
			asChild={asChild}
			size={sizeMap[size]}
			className={cn(colorClass[color], fontSizeMap[size], "font-medium hover:cursor-pointer rounded-full inline-flex items-center gap-2", className)}
			onClick={onClick}
			type={type}
			disabled={disabled}
		>
			{startIcon ? <span className="-ml-0.5 inline-flex items-center">{startIcon}</span> : null}
			<span>{content}</span>
			{endIcon ? <span className="-mr-0.5 inline-flex items-center">{endIcon}</span> : null}
		</Button>
	);
}

export default CtaButton;
