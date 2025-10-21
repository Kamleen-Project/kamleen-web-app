"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type CtaIconButtonProps = {
	color?: "black" | "white" | "whiteBorder";
	size?: "sm" | "md" | "lg";
	className?: string;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	children?: React.ReactNode; // icon content
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	id?: string;
	ariaLabel?: string;
	badgeCount?: number;
	badgeClassName?: string;
	isLoading?: boolean;
};

const sizeMap = {
	sm: "icon",
	md: "icon",
	lg: "icon",
} as const;

const dimensionMap = {
	sm: "h-8 w-8 [&_svg]:size-4",
	md: "h-9 w-9 [&_svg]:size-4",
	lg: "h-10 w-10 [&_svg]:size-5",
} as const;

const colorClass = {
	black: "bg-black text-white hover:bg-black/80 border border-transparent",
	white: "bg-white text-black hover:bg-zinc-100 border border-transparent",
	whiteBorder: "bg-white text-black hover:bg-zinc-100 border border-input",
};

export const CtaIconButton = React.forwardRef<HTMLButtonElement, CtaIconButtonProps>(function CtaIconButton(props, ref): React.ReactElement {
	const { color = "black", size = "md", className, onClick, children, type = "button", disabled, id, ariaLabel, badgeCount, badgeClassName, isLoading } = props;
	return (
		<button
			ref={ref}
			id={id}
			className={cn(
				colorClass[color],
				"relative inline-flex items-center justify-center rounded-full p-0 focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
				dimensionMap[size],
				className
			)}
			onClick={onClick}
			type={type}
			disabled={Boolean(disabled || isLoading)}
			aria-label={ariaLabel}
			aria-busy={isLoading ? true : undefined}
		>
			{/* Hide children when loading, show spinner */}
			<span className={cn(isLoading && "invisible")}>{children}</span>
			{isLoading ? <Loader2 className="absolute animate-spin text-current" /> : null}
			{(badgeCount ?? 0) > 0 ? (
				<span
					className={cn(
						"absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white",
						badgeClassName
					)}
				>
					{badgeCount! > 99 ? "99+" : badgeCount}
				</span>
			) : null}
		</button>
	);
});

export default CtaIconButton;
