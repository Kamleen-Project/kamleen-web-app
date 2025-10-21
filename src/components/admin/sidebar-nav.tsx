"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { ConsoleNavItem } from "@/config/console-nav";

interface SidebarNavProps {
	items: ConsoleNavItem[];
	className?: string;
}

export function SidebarNav({ items, className }: SidebarNavProps) {
	const pathname = usePathname();

	return (
		<nav className={cn("flex flex-col gap-1 px-4 pb-6 overflow-y-auto", className)}>
			{items.map((item) => {
				const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) && item.href !== "/admin");
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"group rounded-lg px-3 py-2 text-sm font-medium transition",
							isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
						)}
					>
						<span>{item.label}</span>
						{item.description ? <p className="text-xs font-normal text-muted-foreground/80 group-hover:text-muted-foreground">{item.description}</p> : null}
					</Link>
				);
			})}
		</nav>
	);
}
