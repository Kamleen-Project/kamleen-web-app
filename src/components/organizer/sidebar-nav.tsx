"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { ConsoleNavItem } from "@/config/console-nav";

export function OrganizerSidebarNav({ className, items }: { className?: string; items: ConsoleNavItem[] }) {
	const pathname = usePathname();

	return (
		<nav className={cn("flex flex-col gap-1", className)}>
			{items.map((item) => {
				const isActive = pathname === item.href;

				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"group rounded-xl px-4 py-3 transition",
							isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
						)}
					>
						<span className="text-sm font-semibold">{item.label}</span>
						{item.description ? <span className="block text-xs text-muted-foreground group-hover:text-muted-foreground">{item.description}</span> : null}
					</Link>
				);
			})}
		</nav>
	);
}

export default OrganizerSidebarNav;
