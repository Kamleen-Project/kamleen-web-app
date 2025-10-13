import Link from "next/link";

import { TogetherLogo } from "@/components/branding";
import { Container } from "@/components/layout/container";
// Removed unused Button import after removing "For teams" button
import { ProfileMenu } from "@/components/layout/profile-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";

const navItems = [
	{ name: "Experiences", href: "/experiences" },
	{ name: "Discover", href: "#discover" },
	{ name: "Why Kamleen", href: "#why" },
	{ name: "Hosts", href: "#hosts" },
	{ name: "Stories", href: "#stories" },
];

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<Container className="flex h-16 items-center justify-between gap-6">
				<Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
					<TogetherLogo className="h-10 w-auto" title="Kamleen" />
					<span className="sr-only">Kamleen</span>
				</Link>

				<nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
					{navItems.map((item) => (
						<Link key={item.name} href={item.href} className="transition hover:text-foreground">
							{item.name}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-3">
					<NotificationsBell />
					<ProfileMenu />
				</div>
			</Container>
		</header>
	);
}
