import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";
import CtaButton from "@/components/ui/cta-button";

export default async function ExplorerOverviewPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return null;
	}

	const reservations = await prisma.experienceBooking.findMany({
		where: { explorerId: session.user.id },
		include: {
			experience: { select: { title: true, location: true, slug: true } },
		},
		orderBy: { createdAt: "desc" },
		take: 3,
	});

	return (
		<ConsolePage title="Plan your next Kamleen moment" subtitle="Pick up where you left off, confirm details, and keep your group in sync.">
			<Card className="border-border/70 bg-card/80 shadow-sm">
				<CardHeader>
					<CardTitle>Upcoming reservations</CardTitle>
					<CardDescription>See what&apos;s next on your itinerary. Confirm details or connect with your host.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					{reservations.length ? (
						reservations.map((reservation) => (
							<div
								key={reservation.id}
								className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/60 px-4 py-3"
							>
								<div className="space-y-1">
									<p className="font-medium text-foreground">{reservation.experience.title}</p>
									<p>{reservation.experience.location}</p>
								</div>
								<CtaButton color="whiteBorder" size="sm" asChild>
									<Link href={`/experiences/${reservation.experience.slug}`}>View details</Link>
								</CtaButton>
							</div>
						))
					) : (
						<p>No reservations yet. Start planning your next adventure.</p>
					)}
				</CardContent>
			</Card>

			<Card className="border-border/70 bg-card/70 shadow-sm">
				<CardHeader>
					<CardTitle>Quick actions</CardTitle>
					<CardDescription>Jump into saved experiences or discover something new.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<CtaButton color="whiteBorder" size="sm" asChild>
						<Link href="/dashboard/explorer/reservations">See all reservations</Link>
					</CtaButton>
					<CtaButton color="whiteBorder" size="sm" asChild>
						<Link href="/dashboard/explorer/wishlist">Browse wishlist</Link>
					</CtaButton>
					<CtaButton color="black" size="sm" asChild>
						<Link href="/experiences">Find a new experience</Link>
					</CtaButton>
				</CardContent>
			</Card>
		</ConsolePage>
	);
}
