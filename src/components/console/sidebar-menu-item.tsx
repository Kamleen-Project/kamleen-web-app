"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface ConsoleSidebarMenuItemProps {
	href: string;
	title: string;
	subtitle?: string;
	className?: string;
}

export function ConsoleSidebarMenuItem({ href, title, subtitle, className }: ConsoleSidebarMenuItemProps) {
	const pathname = usePathname();
	const isActive = pathname === href;

	return (
		<Link
			href={href}
			className={cn(
				"group rounded-xl px-4 py-3 transition",
				isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
				className
			)}
		>
			<span className="text-sm font-semibold">{title}</span>
			{subtitle ? <span className="block text-xs text-muted-foreground group-hover:text-muted-foreground">{subtitle}</span> : null}
		</Link>
	);
}

export default ConsoleSidebarMenuItem;
