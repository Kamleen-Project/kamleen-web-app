"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsoleSidebarMenuItemProps {
	href: string;
	title: string;
	subtitle?: string;
	className?: string;
	showTrailingChevron?: boolean;
	icon?: string | LucideIcon;
}

export function ConsoleSidebarMenuItem({ href, title, subtitle, className, showTrailingChevron = false, icon }: ConsoleSidebarMenuItemProps) {
	const pathname = usePathname();
	const isActive = pathname === href;
	const Icon: LucideIcon | undefined = typeof icon === "string" ? (Icons as unknown as Record<string, LucideIcon>)[icon] : (icon as LucideIcon | undefined);

	return (
		<Link
			href={href}
			className={cn(
				"group block relative rounded-xl px-4 py-3 transition",
				isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
				className
			)}
		>
			<div className="flex items-center gap-3">
				{Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
				<div className="min-w-0">
					<span className="text-sm font-semibold">{title}</span>
					{subtitle ? <span className="block text-xs text-muted-foreground group-hover:text-muted-foreground">{subtitle}</span> : null}
				</div>
			</div>
			{showTrailingChevron ? <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> : null}
		</Link>
	);
}

export default ConsoleSidebarMenuItem;
