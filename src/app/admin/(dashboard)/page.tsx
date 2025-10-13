import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";

export default async function AdminOverviewPage() {
	const [userCount, organizerCount, pendingOrganizerCount] = await Promise.all([
		prisma.user.count(),
		prisma.user.count({ where: { role: "ORGANIZER" } }),
		prisma.user.count({ where: { organizerStatus: "PENDING" } }),
	]);

	return (
		<ConsolePage
			title="Platform health"
			subtitle="Monitor activity across explorers and organizers, track onboarding volume, and keep the marketplace running smoothly."
		>
			<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
				<Card className="border-border/70 bg-card">
					<CardHeader className="pb-2">
						<p className="text-sm font-medium text-muted-foreground">Total users</p>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-4xl font-semibold text-foreground">{userCount}</p>
						<p className="text-xs text-muted-foreground">Includes explorers, organizers, and admins.</p>
					</CardContent>
				</Card>
				<Card className="border-border/70 bg-card">
					<CardHeader className="pb-2">
						<p className="text-sm font-medium text-muted-foreground">Active organizers</p>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-4xl font-semibold text-foreground">{organizerCount}</p>
						<p className="text-xs text-muted-foreground">Accounts with organizer privileges.</p>
					</CardContent>
				</Card>
				<Card className="border-border/70 bg-card">
					<CardHeader className="pb-2">
						<p className="text-sm font-medium text-muted-foreground">Pending onboarding</p>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-4xl font-semibold text-foreground">{pendingOrganizerCount}</p>
						<p className="text-xs text-muted-foreground">Organizer applications awaiting review.</p>
					</CardContent>
				</Card>
			</div>

			<Card className="border-border/70 bg-card/80">
				<CardHeader className="gap-3">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Daily checklist</p>
						<h2 className="text-xl font-semibold text-foreground">What needs your attention today</h2>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					<p>• Review new organizer submissions and fast-track hosts with complete profiles.</p>
					<p>• Scan the users dashboard for accounts flagged for manual review.</p>
					<p>• Coordinate with the Kamleen support team on high-priority guest escalations.</p>
				</CardContent>
			</Card>
		</ConsolePage>
	);
}
