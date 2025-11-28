import Image from "next/image";
import { notFound } from "next/navigation";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ExperienceGallerySection } from "@/components/experiences/experience-gallery-section";
import { ExperienceItinerary } from "@/components/experiences/experience-itinerary";
import { ExperienceStickyHeader } from "@/components/experiences/experience-sticky-header";
import { SessionReservationCard } from "@/components/experiences/session-reservation-card";
import { getServerAuthSession } from "@/lib/auth";
import { CalendarDays, Clock, MapPin, MessageCircle, Star, Users, UserPlus } from "lucide-react";
import { CtaButton } from "@/components/ui/cta-button";
import { parseDurationToMinutes } from "@/lib/duration";

function formatTimeRangeLocal(start: Date, durationLabel: string | null | undefined, fallbackDurationLabel: string | null | undefined): string {
	const minutes = parseDurationToMinutes(durationLabel ?? fallbackDurationLabel ?? null);
	const startStr = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
	if (!minutes) return startStr;
	const end = new Date(start.getTime() + minutes * 60 * 1000);
	const endStr = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(end);
	return `${startStr} to ${endStr}`;
}

function formatUpcomingSessionTitle(start: Date, sessionDuration: string | null | undefined, experienceDuration: string | null | undefined): string {
	const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(start);
	const month = new Intl.DateTimeFormat("en", { month: "short" }).format(start);
	const day = new Intl.DateTimeFormat("en", { day: "numeric" }).format(start);
	const range = formatTimeRangeLocal(start, sessionDuration, experienceDuration);
	return `${weekday}, ${month} ${day} – ${range}`;
}

function computeAvailableSpotsForSession(session: { capacity: number; bookings?: { guests: number }[] }): number {
	const used = Array.isArray(session.bookings) ? session.bookings.reduce((acc, b) => acc + (b.guests || 0), 0) : 0;
	return Math.max(0, session.capacity - used);
}

export default async function ExperiencePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
	const session = await getServerAuthSession();
	if (!session?.user) notFound();

	const { slug } = await params;

	const experience = await prisma.experience.findFirst({
		where: { slug },
		include: {
			organizer: { select: { id: true, name: true, headline: true, image: true, _count: { select: { experiences: true } } } },
			sessions: { orderBy: { startAt: "asc" } },
			itinerarySteps: { orderBy: { order: "asc" } },
		},
	});

	if (!experience || experience.organizerId !== session.user.id) {
		notFound();
	}

	const now = new Date();
	const futureSessions = experience.sessions.filter((s) => s.startAt >= now);
	const upcomingTwo = futureSessions.slice(0, 2);
	const meetingLatitude = experience.meetingLatitude ? Number(experience.meetingLatitude) : null;
	const meetingLongitude = experience.meetingLongitude ? Number(experience.meetingLongitude) : null;
	const meetingMapSrc =
		meetingLatitude !== null && meetingLongitude !== null ? `https://maps.google.com/maps?q=${meetingLatitude},${meetingLongitude}&z=13&output=embed` : null;

	return (
		<div className="bg-muted/20 pb-16">
			{/* Preview ribbon */}
			<div className="sticky top-0 z-20 border-b border-amber-300/50 bg-amber-50/80 px-4 py-2 text-center text-xs text-amber-900">
				<span className="font-medium">Preview</span> — Only visible to you as the organizer
			</div>

			<div className="relative h-[320px] w-full overflow-hidden border-b border-border/60 bg-muted">
				<ImageWithFallback
					src={experience.heroImage ?? "/images/exp-placeholder.png"}
					alt={experience.title}
					fill
					sizes="100vw"
					className="object-cover"
					priority
				/>
				<div className="absolute inset-0" />
			</div>

			<ExperienceStickyHeader
				title={experience.title}
				averageRating={experience.averageRating ?? 0}
				reviewCount={experience.reviewCount ?? 0}
				triggerId="experience-basic-info"
				ctaTargetId="experience-reserve-button"
				experienceId={experience.id}
			/>

			<Container className="mt-8">
				<section id="experience-basic-info" className="space-y-4">
					<div className="space-y-3">
						<Badge variant="soft" className="text-xs">
							Preview of your public page
						</Badge>
						<div className="flex items-start justify-between gap-3">
							<h1 className="text-4xl font-semibold tracking-tight text-foreground">{experience.title}</h1>
						</div>
						<p className="text-base text-muted-foreground">{experience.summary}</p>
					</div>
					<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
						<span className="inline-flex items-center gap-2">
							<MapPin className="size-4" />
							{experience.location}
						</span>
						<span className="inline-flex items-center gap-2">
							<Clock className="size-4" />
							{experience.duration}
						</span>
						<span className="inline-flex items-center gap-2">
							<CalendarDays className="size-4" />
							{experience.category ?? "Experience"}
						</span>
						<span className="inline-flex items-center gap-2">
							<Users className="size-4" />
							Small group experience
						</span>
					</div>
				</section>
			</Container>

			{experience.galleryImages.length ? (
				<Container className="mt-10">
					<ExperienceGallerySection title={experience.title} images={experience.galleryImages} />
				</Container>
			) : null}

			<Container className="mt-8 space-y-8 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:space-y-0">
				<main className="space-y-10 lg:col-span-2">
					<section className="space-y-5 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold text-foreground">Experience overview</h2>
							<p className="text-sm text-muted-foreground">{experience.description ?? experience.summary}</p>
						</div>
					</section>

					{experience.itinerarySteps.length ? (
						<section className="space-y-6 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
							<div>
								<h2 className="text-2xl font-semibold text-foreground">What you&apos;ll do</h2>
								<p className="mt-2 text-sm text-muted-foreground">Follow the flow of the experience and see how each moment unfolds.</p>
							</div>
							<ExperienceItinerary title={experience.title} steps={experience.itinerarySteps} />
						</section>
					) : null}

					<section className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold text-foreground">Where we&apos;ll meet</h2>
							<p className="text-sm text-muted-foreground">{experience.meetingAddress ?? "Exact meeting details will be shared after booking."}</p>
						</div>
						{meetingMapSrc ? (
							<div className="overflow-hidden rounded-xl border border-border/60 bg-muted">
								<iframe title="Meeting location" src={meetingMapSrc} className="h-64 w-full" loading="lazy" allowFullScreen />
							</div>
						) : (
							<p className="text-xs text-muted-foreground">Add latitude and longitude to showcase an embedded map.</p>
						)}
					</section>
				</main>

				<aside className="lg:col-span-1 lg:sticky lg:top-40 lg:self-start">
					<div className="space-y-6 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-lg">
						<p className="text-sm text-muted-foreground">Pricing and booking components are shown for layout preview only.</p>
						{upcomingTwo.length ? (
							<div className="space-y-3">
								<h2 className="text-xl font-semibold text-foreground">Upcoming sessions</h2>
								{upcomingTwo.map((s) => (
									<SessionReservationCard
										key={s.id}
										session={{
											id: s.id,
											startAt: `${s.startAt.getFullYear()}-${String(s.startAt.getMonth() + 1).padStart(2, "0")}-${String(s.startAt.getDate()).padStart(
												2,
												"0"
											)}T${String(s.startAt.getHours()).padStart(2, "0")}:${String(s.startAt.getMinutes()).padStart(2, "0")}`,
											duration: s.duration ?? null,
											capacity: s.capacity,
											priceOverride: s.priceOverride,
											locationLabel: s.locationLabel,
											meetingAddress: s.meetingAddress ?? null,
											availableSpots: computeAvailableSpotsForSession(s as { capacity: number; bookings?: { guests: number }[] }),
										}}
										experience={{
											currency: experience.currency,
											basePrice: experience.price,
											audience: experience.audience,
											duration: experience.duration,
											meetingAddress: experience.meetingAddress ?? null,
											meetingCity: experience.meetingCity ?? null,
											location: experience.location,
										}}
										variant="full"
										disabled
									/>
								))}
							</div>
						) : null}
						<CtaButton color="whiteBorder" className="w-full" disabled>
							Booking disabled in preview
						</CtaButton>
					</div>
				</aside>
			</Container>
		</div>
	);
}
