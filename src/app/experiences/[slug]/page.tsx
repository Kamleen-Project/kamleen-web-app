import Image from "next/image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, MessageCircle, UserPlus, Users } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { CtaButton } from "@/components/ui/cta-button";
import { prisma } from "@/lib/prisma";
import { ExperienceGallerySection } from "@/components/experiences/experience-gallery-section";
import { ExperienceItinerary } from "@/components/experiences/experience-itinerary";
import { ExperienceReviewsSection, type ExperienceReview } from "@/components/experiences/experience-reviews-section";
import { ExperienceRating } from "@/components/experiences/experience-rating";
import { ExperienceStickyHeader } from "@/components/experiences/experience-sticky-header";
import { SaveExperienceButton } from "@/components/experiences/save-experience-button";
import { ExperienceReservationModal } from "@/components/experiences/experience-reservation-modal";
import { SessionReservationCard } from "@/components/experiences/session-reservation-card";
import { ExperienceBookingStatus } from "@/components/experiences/experience-booking-status";
import { getServerAuthSession } from "@/lib/auth";
import { OpenReservationButton } from "@/components/experiences/open-reservation-button";
import { parseDurationToMinutes } from "@/lib/duration";

import { formatCurrency } from "@/lib/format-currency";

// removed unused formatDateTime helper after updating session title format

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

async function getPageData(slug: string) {
	const [experience, session] = await Promise.all([
		prisma.experience.findFirst({
			where: { slug },
			include: {
				organizer: {
					select: {
						name: true,
						headline: true,
						image: true,
						bio: true,
						_count: {
							select: {
								experiences: true,
							},
						},
					},
				},
				sessions: {
					orderBy: { startAt: "asc" },
					include: {
						bookings: {
							where: { status: { in: ["PENDING", "CONFIRMED"] } },
							select: { guests: true },
						},
					},
				},
				itinerarySteps: {
					orderBy: { order: "asc" },
				},
				reviews: {
					orderBy: { createdAt: "desc" },
					take: 12,
					include: {
						explorer: {
							select: {
								name: true,
								image: true,
							},
						},
					},
				},
			},
		}),
		getServerAuthSession(),
	]);

	if (!experience) {
		notFound();
	}

	// Hide non-public experiences unless the viewer has a booking (for UNLISTED)
	const isPublic = experience.status === "PUBLISHED";
	const isUnlisted = experience.status === "UNLISTED";
	if (!isPublic) {
		if (isUnlisted && session?.user) {
			const hasViewerBooking = await prisma.experienceBooking.findFirst({
				where: { experienceId: experience.id, explorerId: session.user.id },
				select: { id: true },
			});
			if (!hasViewerBooking) notFound();
		} else {
			notFound();
		}
	}

	const bookings = session?.user
		? await prisma.experienceBooking.findMany({
			where: {
				experienceId: experience.id,
				explorerId: session.user.id,
			},
			include: {
				session: true,
			},
			orderBy: { createdAt: "desc" },
		})
		: [];

	return {
		experience,
		bookings,
	};
}

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const { experience, bookings } = await getPageData(slug);

	const now = new Date();
	const futureSessions = experience.sessions.filter((session) => session.startAt >= now);
	const upcomingTwoSessions = futureSessions.slice(0, 2);
	const itinerary = experience.itinerarySteps;
	const galleryImages = experience.galleryImages;
	const reservationSessions = futureSessions.map((session) => {
		const used =
			"bookings" in session && Array.isArray((session as { bookings?: { guests: number }[] }).bookings)
				? (session as { bookings: { guests: number }[] }).bookings.reduce((acc, b) => acc + (b.guests || 0), 0)
				: 0;
		const availableSpots = Math.max(0, session.capacity - used);
		return {
			id: session.id,
			// Preserve local time by sending a local-like string (yyyy-MM-ddTHH:mm) without timezone conversion
			startAt: `${session.startAt.getFullYear()}-${String(session.startAt.getMonth() + 1).padStart(2, "0")}-${String(session.startAt.getDate()).padStart(
				2,
				"0"
			)}T${String(session.startAt.getHours()).padStart(2, "0")}:${String(session.startAt.getMinutes()).padStart(2, "0")}`,
			duration: session.duration ?? null,
			capacity: session.capacity,
			priceOverride: session.priceOverride,
			locationLabel: session.locationLabel,
			meetingAddress: session.meetingAddress ?? null,
			availableSpots,
		};
	});
	const hasItinerary = itinerary.length > 0;
	const meetingLatitude = experience.meetingLatitude ? Number(experience.meetingLatitude) : null;
	const meetingLongitude = experience.meetingLongitude ? Number(experience.meetingLongitude) : null;
	const meetingMapSrc =
		meetingLatitude !== null && meetingLongitude !== null ? `https://maps.google.com/maps?q=${meetingLatitude},${meetingLongitude}&z=13&output=embed` : null;
	const hasImage = Boolean(experience.heroImage);
	const averageRating = experience.averageRating ?? 0;
	const reviewCount = experience.reviewCount ?? 0;
	const hasReviews = reviewCount > 0;
	const organizerExperienceCount = experience.organizer._count?.experiences ?? 0;
	const organizerImage = experience.organizer.image;
	const organizerName = experience.organizer.name ?? "Kamleen organizer";
	const organizerInitials = organizerName
		.split(" ")
		.slice(0, 2)
		.map((chunk) => chunk.charAt(0).toUpperCase())
		.join("");
	const reviews: ExperienceReview[] = (experience.reviews ?? []).map((review) => ({
		id: review.id,
		rating: review.rating,
		comment: review.comment,
		createdAt: review.createdAt,
		explorer: review.explorer
			? {
				name: review.explorer.name,
				image: review.explorer.image,
			}
			: null,
	}));
	const showMoreReviewsHref = experience.reviewCount > reviews.length ? `/experiences/${experience.slug}/reviews` : undefined;

	const serializedViewerBookings = bookings.map((booking) => ({
		id: booking.id,
		status: booking.status,
		guests: booking.guests,
		totalPrice: booking.totalPrice,
		currency: experience.currency,
		createdAt: booking.createdAt.toISOString(),
		expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
		sessionId: booking.sessionId,
		session: booking.session
			? {
				id: booking.session.id,
				// Preserve local time similar to reservationSessions
				startAt: `${booking.session.startAt.getFullYear()}-${String(booking.session.startAt.getMonth() + 1).padStart(2, "0")}-${String(
					booking.session.startAt.getDate()
				).padStart(2, "0")}T${String(booking.session.startAt.getHours()).padStart(2, "0")}:${String(booking.session.startAt.getMinutes()).padStart(2, "0")}`,
				duration: booking.session.duration ?? null,
				locationLabel: booking.session.locationLabel,
			}
			: null,
	}));
	const pendingViewerBooking =
		serializedViewerBookings.find((booking) => booking.status === "PENDING" && (!booking.expiresAt || new Date(booking.expiresAt) > new Date())) ?? null;

	return (
		<div className="bg-muted/20 pb-16">
			<div className="relative h-[320px] w-full overflow-hidden border-b border-border/60 bg-muted">
				<ImageWithFallback
					src={experience.heroImage ?? "/images/image-placeholder.png"}
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
				averageRating={averageRating}
				reviewCount={reviewCount}
				triggerId="experience-basic-info"
				ctaTargetId="experience-reserve-button"
				experienceId={experience.id}
				initialPendingReservation={
					pendingViewerBooking
						? {
							expiresAt: pendingViewerBooking.expiresAt,
						}
						: null
				}
			/>

			<Container className="mt-8">
				<section id="experience-basic-info" className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-start justify-between gap-3">
							<h1 className="text-4xl font-semibold tracking-tight text-foreground">{experience.title}</h1>
							<SaveExperienceButton experienceId={experience.id} size="lg" />
						</div>
						<ExperienceRating averageRating={averageRating} reviewCount={reviewCount} />
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

			{galleryImages.length ? (
				<Container className="mt-10">
					<ExperienceGallerySection title={experience.title} images={galleryImages} />
				</Container>
			) : null}

			<Container className="mt-8 space-y-8 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:space-y-0">
				<main className="space-y-10 lg:col-span-2">
					<section className="space-y-5 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold text-foreground">Experience overview</h2>
							<p className="text-sm text-muted-foreground">{experience.description ?? experience.summary}</p>
						</div>
						{experience.tags.length ? (
							<div className="flex flex-wrap gap-2">
								{experience.tags.map((tag) => (
									<Badge key={tag} variant="soft" className="text-xs">
										{tag}
									</Badge>
								))}
							</div>
						) : null}
					</section>

					{hasItinerary ? (
						<section className="space-y-6 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
							<div>
								<h2 className="text-2xl font-semibold text-foreground">What you&apos;ll do</h2>
								<p className="mt-2 text-sm text-muted-foreground">Follow the flow of the experience and see how each moment unfolds.</p>
							</div>
							<ExperienceItinerary title={experience.title} steps={itinerary} />
						</section>
					) : null}

					<section className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold text-foreground">Where we&apos;ll meet</h2>
							<p className="text-sm text-muted-foreground">{experience.meetingAddress ?? "Exact meeting details will be shared after booking."}</p>
							<div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
								{experience.meetingCity ? <span>{experience.meetingCity}</span> : null}
								{experience.meetingCountry ? <span>{experience.meetingCountry}</span> : null}
							</div>
						</div>
						{meetingMapSrc ? (
							<div className="overflow-hidden rounded-xl border border-border/60 bg-muted">
								<iframe title="Meeting location" src={meetingMapSrc} className="h-64 w-full" loading="lazy" allowFullScreen />
							</div>
						) : (
							<p className="text-xs text-muted-foreground">Add latitude and longitude to showcase an embedded map.</p>
						)}
					</section>

					<section className="rounded-2xl border border-border/60 bg-background/80 p-8 shadow-sm">
						<div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
							<div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
								{organizerImage ? (
									<Image src={organizerImage} alt={`${experience.organizer.name} portrait`} fill sizes="96px" className="object-cover" />
								) : (
									<span className="text-2xl font-semibold text-muted-foreground">{organizerInitials}</span>
								)}
								<span className="absolute bottom-2 right-2 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" aria-hidden="true" />
							</div>
							<div className="space-y-3">
								<div>
									<p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Organizer</p>
									<h2 className="mt-2 text-2xl font-semibold text-foreground">{organizerName}</h2>
									{experience.organizer.headline ? <p className="text-sm text-muted-foreground">{experience.organizer.headline}</p> : null}
								</div>
								{experience.organizer.bio ? <p className="text-sm text-muted-foreground">{experience.organizer.bio}</p> : null}
								<p className="text-sm font-medium text-foreground">
									{organizerExperienceCount} experience{organizerExperienceCount === 1 ? "" : "s"} hosted
								</p>
								<div className="flex flex-col gap-3 sm:flex-row">
									<CtaButton size="md" color="black" className="w-full sm:w-auto" startIcon={<UserPlus className="size-4" />}>
										Follow organizer
									</CtaButton>
									<CtaButton size="md" color="whiteBorder" className="w-full sm:w-auto" startIcon={<MessageCircle className="size-4" />}>
										Message
									</CtaButton>
								</div>
							</div>
						</div>
					</section>
				</main>

				<aside className="lg:col-span-1 lg:sticky lg:top-40 lg:self-start">
					<div className="space-y-6">
						{serializedViewerBookings.length ? (
							<ExperienceBookingStatus
								bookings={serializedViewerBookings}
								experience={{
									title: experience.title,
									audience: experience.audience,
									duration: experience.duration,
									location: experience.location,
									meetingAddress: experience.meetingAddress ?? null,
									meetingCity: experience.meetingCity ?? null,
								}}
							/>
						) : null}
						<div className="space-y-6 rounded-2xl border border-border/60 bg-background/80 p-8 shadow-lg" data-reserve-target="experience-reserve-button">
							<div className="flex flex-col gap-4">
								<div className="space-y-2">
									<p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">From</p>
									<div className="flex items-end gap-2">
										<p className="text-3xl font-semibold text-foreground">{formatCurrency(experience.price, experience.currency)}</p>
										<p className="text-xs text-muted-foreground pb-1.5">per guest</p>
									</div>
								</div>
								<div className="flex flex-col gap-3">
									<ExperienceReservationModal
										experience={{
											id: experience.id,
											title: experience.title,
											currency: experience.currency,
											price: experience.price,
											location: experience.location,
											audience: experience.audience,
											duration: experience.duration,
											meetingAddress: experience.meetingAddress ?? null,
											meetingCity: experience.meetingCity ?? null,
										}}
										sessions={reservationSessions}
										buttonSize="lg"
										buttonClassName="w-full sm:w-auto"
										buttonId="experience-reserve-button"
										viewerPendingBooking={
											pendingViewerBooking
												? {
													id: pendingViewerBooking.id,
													sessionId: pendingViewerBooking.sessionId,
													guests: pendingViewerBooking.guests,
													expiresAt: pendingViewerBooking.expiresAt,
												}
												: undefined
										}
									/>
								</div>
							</div>

							<div className="space-y-4">
								<h2 className="text-xl font-semibold text-foreground">Upcoming sessions</h2>
								<div className="space-y-3">
									{upcomingTwoSessions.length ? (
										upcomingTwoSessions.map((session) => (
											<SessionReservationCard
												key={session.id}
												session={{
													id: session.id,
													startAt: `${session.startAt.getFullYear()}-${String(session.startAt.getMonth() + 1).padStart(2, "0")}-${String(
														session.startAt.getDate()
													).padStart(2, "0")}T${String(session.startAt.getHours()).padStart(2, "0")}:${String(session.startAt.getMinutes()).padStart(2, "0")}`,
													duration: session.duration ?? null,
													capacity: session.capacity,
													priceOverride: session.priceOverride,
													locationLabel: session.locationLabel,
													meetingAddress: session.meetingAddress ?? null,
													availableSpots: computeAvailableSpotsForSession(session as { capacity: number; bookings?: { guests: number }[] }),
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
												variant="preview"
												disabled={computeAvailableSpotsForSession(session as { capacity: number; bookings?: { guests: number }[] }) <= 0}
											/>
										))
									) : (
										<p className="text-sm text-muted-foreground">New sessions will be announced soon.</p>
									)}
								</div>

								{futureSessions.length ? <OpenReservationButton targetButtonId="experience-reserve-button" className="w-full" /> : null}

								<div className="space-y-1 text-sm text-muted-foreground">
									<p className="font-medium text-foreground">Need to coordinate?</p>
									<p>Message the host to adjust group size, dietary needs, or accessibility considerations.</p>
								</div>
							</div>
						</div>
					</div>
				</aside>
			</Container>

			<Container className="mt-12">
				<ExperienceReviewsSection
					title={experience.title}
					averageRating={experience.averageRating ?? 0}
					reviewCount={experience.reviewCount ?? 0}
					reviews={reviews}
					showMoreHref={showMoreReviewsHref}
					experienceId={experience.id}
				/>
			</Container>
		</div>
	);
}
