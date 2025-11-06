import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { AddExperienceModal } from "@/components/organizer/add-experience-modal";
import { BecomeOrganizerModal } from "@/components/organizer/become-organizer-modal";
import { getServerAuthSession } from "@/lib/auth";
import { CtaButton } from "@/components/ui/cta-button";

export default async function DashboardPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const { user } = session;
	const isAdmin = user.role === "ADMIN";
	const isOrganizer = user.activeRole === "ORGANIZER";
	const isExplorer = user.activeRole === "EXPLORER";
	return (
		<div className="bg-muted/30 py-16">
			<Container className="space-y-10">
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back, {user.name ?? "Explorer"}</h1>
						<Badge variant="soft" className="text-xs">
							Active role: {user.activeRole.toLowerCase()}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">Manage your reservations, bookmark experiences, and stay in sync with your hosts.</p>
				</div>

				<div className="grid gap-6 rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm md:grid-cols-2">
					<div className="space-y-4">
						<h2 className="text-xl font-semibold text-foreground">Explorer tools</h2>
						<p className="text-sm text-muted-foreground">View upcoming activities, manage guest lists, and keep your plans organized in one place.</p>
						<div className="flex flex-wrap gap-3">
							<CtaButton color="whiteBorder" size="sm">
								View reservations
							</CtaButton>
							<CtaButton color="whiteBorder" size="sm">
								Saved experiences
							</CtaButton>
						</div>
					</div>

					<div className="space-y-4">
						<h2 className="text-xl font-semibold text-foreground">Organizer tools</h2>
						<p className="text-sm text-muted-foreground">
							{isOrganizer
								? "Manage your published experiences, review bookings, and connect with guests."
								: "Ready to host your own experience? Submit an organizer request and our team will reach out."}
						</p>
						<div className="flex flex-wrap gap-3">
							{isOrganizer ? (
								<>
									<CtaButton color="whiteBorder" size="sm" asChild>
										<Link href="/dashboard/organizer">Open organizer console</Link>
									</CtaButton>
									<AddExperienceModal />
								</>
							) : isExplorer ? (
								<BecomeOrganizerModal />
							) : null}
							<CtaButton color="black" size="sm">
								Learn about hosting
							</CtaButton>
						</div>
					</div>
				</div>

				{isAdmin ? (
					<div className="rounded-2xl border border-border/60 bg-background/90 p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-foreground">Admin quick links</h2>
						<p className="mt-2 text-sm text-muted-foreground">Review organizer applications, monitor platform health, and manage user permissions.</p>
						<div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
							<CtaButton color="black" size="sm" asChild>
								<Link href="/admin">Go to admin console</Link>
							</CtaButton>
							<CtaButton color="black" size="sm">
								Go to admin console
							</CtaButton>
							<span className="text-muted-foreground">•</span>
							<CtaButton color="black" size="sm" asChild>
								<Link href="/admin/organizers">Organizer reviews</Link>
							</CtaButton>
						</div>
					</div>
				) : null}
			</Container>
		</div>
	);
}
