"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

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
	form?: string;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	isLoading?: boolean;
	title?: string;
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
	form,
	startIcon,
	endIcon,
	isLoading,
	title,
}: CtaButtonProps) {
	const content = children ?? label ?? "Button";

	// When asChild is true, Button expects a single element child. Render children directly.
	if (asChild) {
		return (
			<Button
				id={id}
				asChild
				size={sizeMap[size]}
				className={cn(colorClass[color], fontSizeMap[size], "font-medium hover:cursor-pointer rounded-full inline-flex items-center gap-2", className)}
				onClick={onClick}
				type={type}
				disabled={Boolean(disabled || isLoading)}
				form={form}
				title={title}
			>
				{children as React.ReactElement}
			</Button>
		);
	}

	return (
		<Button
			id={id}
			size={sizeMap[size]}
			className={cn(colorClass[color], fontSizeMap[size], "font-medium hover:cursor-pointer rounded-full inline-flex items-center gap-2", className)}
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
		</Button>
	);
}

export default CtaButton;
