import Link from "next/link";

import { ConsoleSidebar } from "@/components/console/sidebar";
import { ConsoleSidebarMenuItem } from "@/components/console/sidebar-menu-item";
import type { ConsoleNavItem } from "@/config/console-nav";

interface ConsoleLayoutProps {
	title: string;
	subtitle: string;
	headerHref: string;
	navItems: ConsoleNavItem[];
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export function ConsoleLayout({ title, subtitle, headerHref, navItems, footer, children }: ConsoleLayoutProps) {
	return (
		<div className="min-h-screen bg-muted/20">
			<div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
				<ConsoleSidebar title={title} subtitle={subtitle} headerHref={headerHref} footer={footer}>
					{navItems.map((item) => (
						<ConsoleSidebarMenuItem key={item.href} href={item.href} title={item.label} subtitle={item.description} />
					))}
				</ConsoleSidebar>
				<main className="flex-1 px-5 py-10 sm:px-8 lg:px-12">
					<div className="mb-6 flex flex-col gap-2 lg:hidden">
						<p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</p>
						<h1 className="text-2xl font-semibold text-foreground">{title}</h1>
					</div>
					<div className="mb-8 lg:hidden">
						<div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-card/70 px-4 py-3">
							{navItems.map((item) => (
								<Link key={item.href} href={item.href} className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
									{item.label}
								</Link>
							))}
						</div>
					</div>
					{children}
				</main>
			</div>
		</div>
	);
}

export default ConsoleLayout;
