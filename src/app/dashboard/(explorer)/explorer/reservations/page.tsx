import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperienceBookingStatus } from "@/generated/prisma";
import { ConsolePage } from "@/components/console/page";
import CtaButton from "@/components/ui/cta-button";

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

function formatRequested(dt: Date) {
	return `Requested ${new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(dt)}`;
}

export default async function ExplorerReservationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
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

	// Order reservations from new to old by request time
	upcoming.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	past.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
										<p className="text-xs text-muted-foreground">{formatRequested(booking.createdAt)}</p>
										<p className="text-xs text-muted-foreground">
											Booking ID: <span className="font-mono text-foreground">{booking.id}</span>
										</p>
										<p className="font-semibold text-foreground">{booking.experience.title}</p>
										{booking.experience.organizer?.name ? <p className="text-xs text-muted-foreground">Hosted by {booking.experience.organizer.name}</p> : null}
										{booking.experience.location ? <p>{booking.experience.location}</p> : null}
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
											{formatStatus(booking.status)}
										</span>
										{booking.paymentStatus ? (
											<span className="rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
												{booking.paymentStatus}
											</span>
										) : null}
										<CtaButton color="whiteBorder" size="sm" asChild>
											<Link href={`/experiences/${booking.experience.slug}`}>View experience</Link>
										</CtaButton>
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
									<CtaButton color="whiteBorder" size="sm" asChild>
										<Link href={`/dashboard/explorer/reservations/${booking.id}`}>Manage booking</Link>
									</CtaButton>
									<CtaButton color="black" size="sm" asChild>
										<Link href={`/dashboard/explorer/reservations/${booking.id}/message`}>Message host</Link>
									</CtaButton>
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

	const sp = (await searchParams) || {};
	const paid = (sp.paid ?? "") === "1";
	const cancelled = (sp.cancelled ?? "") === "1";

	return (
		<ConsolePage title="Reservations" subtitle="Your upcoming and past reservations">
			{paid || cancelled ? (
				<div
					className={
						"mb-4 rounded-lg border px-4 py-3 text-sm " +
						(paid ? "border-emerald-600/30 bg-emerald-50 text-emerald-700" : "border-red-600/30 bg-red-50 text-red-700")
					}
				>
					{paid
						? "Payment succeeded. Your reservation is confirmed and tickets will be sent shortly."
						: "Payment canceled or failed. Your reservation remains pending."}
				</div>
			) : null}
			{renderSection("Upcoming", "Everything that&apos;s on the horizon. Confirm logistics or reach out to the host.", upcoming)}

			{renderSection("Past", "A log of experiences you&apos;ve already enjoyed. Use it for memories or quick rebooking.", past)}
		</ConsolePage>
	);
}
