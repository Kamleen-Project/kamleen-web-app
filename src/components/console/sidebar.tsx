import Link from "next/link";

import { cn } from "@/lib/utils";

interface ConsoleSidebarProps {
	title: string;
	subtitle?: string;
	headerHref?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
}

export function ConsoleSidebar({ title, subtitle, headerHref, children, footer, className }: ConsoleSidebarProps) {
	return (
		<aside
			className={cn(
				"sticky top-16 hidden h-[calc(100dvh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-border/70 bg-background/60 lg:flex lg:flex-col",
				className
			)}
		>
			<div className="border-b border-border/70 px-6 py-6">
				{headerHref ? (
					<Link href={headerHref} className="flex flex-col gap-1">
						{subtitle ? <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</span> : null}
						<span className="text-xl font-semibold text-foreground">{title}</span>
					</Link>
				) : (
					<div className="flex flex-col gap-1">
						{subtitle ? <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</span> : null}
						<span className="text-xl font-semibold text-foreground">{title}</span>
					</div>
				)}
			</div>
			<nav className={cn("flex flex-col gap-1 px-4 py-6 overflow-y-auto")}>{children}</nav>
			{footer ? <div className="mt-auto px-6 pb-6">{footer}</div> : null}
		</aside>
	);
}

export default ConsoleSidebar;
