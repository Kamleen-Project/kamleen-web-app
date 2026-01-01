import Link from "next/link";
import type { Session } from "next-auth";

import { TogetherLogo } from "@/components/branding";
import { Container } from "@/components/layout/container";
// Removed unused Button import after removing "For teams" button
import { ProfileMenu } from "@/components/layout/profile-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { TicketsMenu } from "@/components/layout/tickets-menu";
import { RoleSwitcher } from "@/components/layout/role-switcher";
// Removed BecomeOrganizerModal from top nav; moved into profile dropdown

const navItems = [
	{ name: "Experiences", href: "/experiences" },
	{ name: "Guides", href: "/guides" },
];

export function SiteHeader({ session }: { session: Session | null }) {
	const isOrganizerApproved = session?.user?.organizerStatus === "APPROVED";
	const isExplorer = session?.user?.activeRole === "EXPLORER";
	const showRoleSwitcher = Boolean(session?.user) && isOrganizerApproved;
	return (
		<header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transform-gpu">
			<Container className="flex h-16 items-center justify-between gap-6">
				<Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
					<TogetherLogo className="h-10 w-auto" title="Kamleen" variant="light" />
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
					{showRoleSwitcher ? <RoleSwitcher className="hidden sm:flex" /> : null}
					{isExplorer ? <TicketsMenu /> : null}
					{session?.user ? <NotificationsBell /> : null}
					<ProfileMenu />
				</div>
			</Container>
		</header>
	);
}
