import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import Link from "next/link";
import { Clock, Eye, ExternalLink, MapPin, Pencil, Plus, Tags, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import type { ExperienceStatus, ExperienceVerificationStatus } from "@/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import { Card, CardContent } from "@/components/ui/card";
import { InfoBadge } from "@/components/ui/info-badge";
import { formatCurrency } from "@/lib/format-currency";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { ExperienceStatusControl } from "@/components/organizer/experience-status-control";
import { SubmitVerificationButton } from "@/components/organizer/submit-verification-button";
import { AddExperienceModal } from "@/components/organizer/add-experience-modal";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";
import { ImportExperienceModal } from "@/components/organizer/import-experience-modal";
import { ConsolePage } from "@/components/console/page";

export default async function OrganizerExperiencesPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return null;
	}

	const experiencesRaw = await prisma.experience.findMany({
		where: { organizerId: session.user.id, status: { not: "ARCHIVED" } },
		orderBy: { createdAt: "desc" },
		select: experienceCardSelect,
	});

	type OrganizerListExperience = {
		id: string;
		title: string;
		summary?: string;
		location: string;
		duration?: string;
		category?: string;
		audience?: string;
		price: number;
		currency?: string;
		slug: string;
		image?: string;
		sessions?: Array<{ id: string; startAt: string; duration?: string }>;
		status?: ExperienceStatus;
		verificationStatus?: ExperienceVerificationStatus;
		hasActiveBookings?: boolean;
		activeReservations?: number;
		pastReservations?: number;
	};

	const experiences: OrganizerListExperience[] = experiencesRaw.map((e) => mapExperienceToCard(e) as unknown as OrganizerListExperience);

	return (
		<ConsolePage
			title="Experiences"
			subtitle="Update details, refresh imagery, and make sure your sessions feel accurate."
			action={
				<div className="flex items-center gap-2">
					<AddExperienceModal />
					<ImportExperienceModal />
				</div>
			}
		>
			<div className="grid gap-4">
				{experiences.length ? (
					experiences.map((experience) => {
						const currency = experience.currency ?? "USD";
						const formattedAmount = formatCurrency(experience.price, currency);
						const now = new Date();
						const upcoming = (experience.sessions ?? [])
							.map((s) => ({ id: s.id, date: new Date(s.startAt) }))
							.filter((s) => !Number.isNaN(s.date.getTime()) && s.date >= now);

						return (
							<Card key={experience.id} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
								{/* Full-width cover image at top with overlay controls */}
								<div className="relative aspect-[16/4] w-full overflow-hidden rounded-xl">
									<ImageWithFallback
										src={experience.image ?? "/images/exp-placeholder.png"}
										alt={experience.title}
										fill
										className="object-cover object-center"
										sizes="100vw"
									/>
									<div className="pointer-events-none absolute inset-0 p-2">
										<div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-2">
											<CtaIconButton asChild size="md" color="whiteBorder" ariaLabel="Preview">
												<Link href={`/experiences/preview/${experience.slug}`} target="_blank" rel="noopener noreferrer">
													<Eye />
												</Link>
											</CtaIconButton>
											<ExperienceStatusControl
												experienceId={experience.id}
												currentStatus={(experience.status ?? "PUBLISHED") as ExperienceStatus}
												verificationStatus={(experience.verificationStatus ?? "NOT_SUBMITTED") as ExperienceVerificationStatus}
												hasActiveBookings={Boolean(experience.hasActiveBookings)}
											/>
											{experience.status === "PUBLISHED" ? (
												<CtaIconButton asChild size="md" color="whiteBorder" ariaLabel="Open public page">
													<Link href={`/experiences/${experience.slug}`} target="_blank" rel="noopener noreferrer">
														<ExternalLink />
													</Link>
												</CtaIconButton>
											) : null}
										</div>
									</div>
								</div>

								{/* Content area */}
								<div className="flex flex-col gap-3 pt-4">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<h3 className="truncate text-lg font-semibold text-foreground">{experience.title}</h3>
											{/* Address under title with icon (no frame) */}
											<div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
												<MapPin className="size-4" />
												<span className="truncate">{experience.location}</span>
											</div>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<EditExperienceModal experienceId={experience.id} color="whiteBorder" size="icon">
												<Pencil />
											</EditExperienceModal>
											<SubmitVerificationButton
												experienceId={experience.id}
												verificationStatus={(experience.verificationStatus ?? "NOT_SUBMITTED") as ExperienceVerificationStatus}
											/>
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<InfoBadge icon={Tags}>{experience.category ?? "general"}</InfoBadge>
										<InfoBadge icon={Users}>{experience.audience ?? "all"}</InfoBadge>
										<InfoBadge icon={Clock}>{experience.duration}</InfoBadge>
										<InfoBadge className="ml-auto" uppercase={false} value={formattedAmount} suffix={` ${currency} / spot`} />
									</div>

									{/* Status control has been moved next to action buttons above */}

									{/* Reservations summary and Upcoming events */}
									<div className="mt-1 flex items-start gap-6">
										{/* Reservations summary (left, fit content) */}
										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<h4 className="text-sm font-medium text-foreground">Reservations</h4>
											</div>
											<div className="space-y-2 text-sm p-3 pl-0 gap-1 flex flex-col">
												<div className="flex items-center gap-2">
													<Users className="size-4 text-muted-foreground" />
													<span className="text-muted-foreground">Active</span>
													<span className="ml-auto font-semibold text-foreground pl-2">{Number(experience.activeReservations || 0)}</span>
												</div>
												<div className="flex items-center gap-2">
													<Clock className="size-4 text-muted-foreground" />
													<span className="text-muted-foreground">Past</span>
													<span className="ml-auto font-semibold text-foreground pl-2	">{Number(experience.pastReservations || 0)}</span>
												</div>
											</div>
										</div>

										{/* Upcoming events (right, fills remaining space) */}
										<div className="flex-1 space-y-2">
											<div className="flex items-center gap-2">
												<h4 className="text-sm font-medium text-foreground">Upcoming sessions</h4>
												<span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{upcoming.length}</span>
											</div>
											{upcoming.length ? (
												<div className="-mx-4 overflow-x-auto">
													<div className="mx-4 flex items-center gap-2 whitespace-nowrap">
														{upcoming.map((s) => {
															const dayName = new Intl.DateTimeFormat("en", { weekday: "short" }).format(s.date);
															const dayNum = new Intl.DateTimeFormat("en", { day: "numeric" }).format(s.date);
															const monthName = new Intl.DateTimeFormat("en", { month: "short" }).format(s.date);
															const timeStr = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(s.date);
															return (
																<div key={s.id} className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-black p-2 text-center text-white">
																	<div className="text-[10px] uppercase tracking-wide opacity-80">{dayName}</div>
																	<div className="text-xl font-semibold leading-none">{dayNum}</div>
																	<div className="text-[11px] leading-none">{monthName}</div>
																	<div className="text-[10px] opacity-80">at {timeStr}</div>
																</div>
															);
														})}
														{/* Add new session card */}
														<EditExperienceModal
															experienceId={experience.id}
															color="whiteBorder"
															size="icon"
															className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-dashed border-border/60 bg-background/50 text-muted-foreground"
															initialStep={4}
															sessionsOnly
														>
															<Plus />
														</EditExperienceModal>
													</div>
												</div>
											) : (
												<p className="text-xs text-muted-foreground">No upcoming sessions scheduled</p>
											)}
										</div>
									</div>
								</div>
							</Card>
						);
					})
				) : (
					<Card className="border-dashed border-border/60 bg-card/60">
						<CardContent className="flex flex-col items-center gap-4 py-24 text-center">
							<h3 className="text-lg font-semibold text-foreground">No experiences published yet.</h3>
							<AddExperienceModal />
						</CardContent>
					</Card>
				)}
			</div>
		</ConsolePage>
	);
}
