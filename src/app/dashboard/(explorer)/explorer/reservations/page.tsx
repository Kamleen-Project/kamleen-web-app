import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ExperienceBookingStatus } from "@/generated/prisma";
import { ConsolePage } from "@/components/console/page";

function formatStatus(status: ExperienceBookingStatus) {
	switch (status) {
		case "CONFIRMED":
			return "Confirmed";
		case "PENDING":
			return "Awaiting host";
		case "CANCELLED":
			return "Cancelled";
		default:
			return String(status).toLowerCase();
	}
}

export default async function ExplorerReservationsPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const bookings = await prisma.experienceBooking.findMany({
		where: { explorerId: session.user.id },
		orderBy: { session: { startAt: "asc" } },
		include: {
			experience: {
				select: {
					title: true,
					slug: true,
					location: true,
					organizer: { select: { name: true } },
				},
			},
			session: { select: { startAt: true } },
		},
	});

	const [upcoming, past] = bookings.reduce<[typeof bookings, typeof bookings]>(
		(acc, booking) => {
			const [future, history] = acc;
			if (booking.session.startAt > new Date()) {
				future.push(booking);
			} else {
				history.push(booking);
			}
			return acc;
		},
		[[], []]
	);

	function renderSection(title: string, description: string, items: typeof bookings) {
		return (
			<Card className="border-border/70 bg-card/80 shadow-sm">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					{items.length ? (
						items.map((booking) => (
							<div key={booking.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-1">
										<p className="font-semibold text-foreground">{booking.experience.title}</p>
										<p>
											{booking.experience.location}
											{booking.experience.organizer?.name ? ` • Hosted by ${booking.experience.organizer.name}` : ""}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
											{formatStatus(booking.status)}
										</span>
										<Button asChild size="sm" variant="outline">
											<Link href={`/experiences/${booking.experience.slug}`}>View experience</Link>
										</Button>
									</div>
								</div>
								<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									<span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(booking.session.startAt)}</span>
									<span>•</span>
									<span>
										{booking.guests} guest{booking.guests === 1 ? "" : "s"}
									</span>
									{booking.notes ? (
										<>
											<span>•</span>
											<span>Notes added</span>
										</>
									) : null}
								</div>
								<div className="mt-4 flex flex-wrap gap-2">
									<Button asChild variant="secondary" size="sm">
										<Link href={`/dashboard/explorer/reservations/${booking.id}`}>Manage booking</Link>
									</Button>
									<Button asChild variant="ghost" size="sm" className="text-primary">
										<Link href={`/dashboard/explorer/reservations/${booking.id}/message`}>Message host</Link>
									</Button>
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground/80">No reservations in this list yet.</p>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<ConsolePage title="Your Kamleen itinerary" subtitle="Track confirmations, share details, and stay coordinated with your hosts.">
			{renderSection("Upcoming", "Everything that&apos;s on the horizon. Confirm logistics or reach out to the host.", upcoming)}

			{renderSection("Past", "A log of experiences you&apos;ve already enjoyed. Use it for memories or quick rebooking.", past)}
		</ConsolePage>
	);
}
