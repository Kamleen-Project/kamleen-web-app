"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsoleSidebarMenuItemProps {
	href: string;
	title: string;
	subtitle?: string;
	className?: string;
	showTrailingChevron?: boolean;
}

export function ConsoleSidebarMenuItem({ href, title, subtitle, className, showTrailingChevron = false }: ConsoleSidebarMenuItemProps) {
	const pathname = usePathname();
	const isActive = pathname === href;

	return (
		<Link
			href={href}
			className={cn(
				"group block relative rounded-xl px-4 py-3 transition",
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
