"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
// No arrow icon for the group header to keep a clean alignment

import { cn } from "@/lib/utils";
import type { ConsoleNavItem } from "@/config/console-nav";
import { ConsoleSidebarMenuItem } from "@/components/console/sidebar-menu-item";

export function ConsoleSidebarMenuGroup({ item }: { item: ConsoleNavItem }) {
	const pathname = usePathname();
	const isInGroup = useMemo(() => pathname.startsWith(item.href), [pathname, item.href]);
	const [open, setOpen] = useState<boolean>(isInGroup);

	return (
		<div className="rounded-xl">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={cn(
					"group flex w-full items-center rounded-xl px-4 py-3 text-left transition",
					isInGroup ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
				)}
			>
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold">{item.label}</div>
					{item.description ? <div className="truncate text-xs text-muted-foreground group-hover:text-muted-foreground">{item.description}</div> : null}
				</div>
			</button>

			<div className={cn("overflow-hidden pl-3", open ? "mt-1 max-h-[1000px]" : "max-h-0")}>
				<div className="ml-2 border-l border-border/50 pl-3">
					{(item.children || []).map((child) => (
						<ConsoleSidebarMenuItem key={child.href} href={child.href} title={child.label} className="my-0.5" showTrailingChevron />
					))}
				</div>
			</div>
		</div>
	);
}

export default ConsoleSidebarMenuGroup;
