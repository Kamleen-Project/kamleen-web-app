"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BaseProps = {
	className?: string;
	children: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
	role?: string;
};

const baseItemClasses =
	"rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer";
const neutralItemClasses = "text-foreground hover:bg-muted";
const dangerItemClasses = "text-destructive hover:bg-destructive/10 hover:text-destructive";
const ctaItemClasses = "text-white bg-[#EC4050] hover:bg-[#EC4050]/90";

export type MenuItemVariant = "neutral" | "danger" | "cta";

function getVariantClasses(variant: MenuItemVariant): string {
	switch (variant) {
		case "danger":
			return dangerItemClasses;
		case "cta":
			return ctaItemClasses;
		default:
			return neutralItemClasses;
	}
}

export type MenuItemProps = BaseProps & {
	href?: string;
	prefetch?: boolean;
	onClick?: () => void;
	type?: "button" | "submit" | "reset";
	variant?: MenuItemVariant;
};

export function MenuItem({
	href,
	children,
	className,
	icon,
	variant = "neutral",
	prefetch,
	role = "menuitem",
	onClick,
	type = "button",
	disabled,
}: MenuItemProps): React.ReactElement {
	const commonClasses = cn(
		baseItemClasses,
		getVariantClasses(variant),
		"inline-flex w-full items-center gap-2 text-left",
		disabled && "pointer-events-none opacity-60",
		className
	);

	if (href) {
		return (
			<Link href={href} role={role} prefetch={prefetch} className={commonClasses}>
				{icon ? <span className="inline-flex items-center">{icon}</span> : null}
				<span className="truncate">{children}</span>
			</Link>
		);
	}

	return (
		<button type={type} role={role} onClick={onClick} disabled={disabled} className={commonClasses}>
			{icon ? <span className="inline-flex items-center">{icon}</span> : null}
			<span className="truncate">{children}</span>
		</button>
	);
}

export function MenuSeparator(): React.ReactElement {
	return <div className="my-1 h-px w-full bg-border/60" role="separator" />;
}
