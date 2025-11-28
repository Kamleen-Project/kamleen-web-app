import Link from "next/link";
import type { Prisma } from "@/generated/prisma";
import { Camera, ChefHat, Compass, Flame, Heart, Palette, Sparkles, Users, Waves, Wine } from "lucide-react";

import { ExperienceCard, type Experience } from "@/components/cards/experience-card";
import { FeatureCard } from "@/components/cards/feature-card";
import { HostCard, type Host } from "@/components/cards/host-card";
// Removed StatCard import as stats section is being removed
import { TestimonialCard, type Testimonial } from "@/components/cards/testimonial-card";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import StickySearchSection from "@/components/experiences/sticky-search-section";
import { ExperienceCarousel } from "@/components/experiences/experience-carousel";
import { prisma } from "@/lib/prisma";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import { defaultFaqs } from "@/data/faqs";
import { NewsletterSection } from "@/components/marketing/newsletter-section";

type CarouselCategory = { id: string; slug: string; name: string; subtitle: string; picture: string; experienceCount: number };

async function loadCategoriesForCarousel(): Promise<CarouselCategory[]> {
	const categories = (await prisma.experienceCategory.findMany({
		orderBy: { name: "asc" },
		include: { _count: { select: { experiences: true } } },
		take: 12,
	})) as unknown as Array<{ id: string; slug: string; name: string; subtitle: string; picture: string; _count: { experiences: number } }>;

	return categories.map((c) => ({
		id: c.id,
		slug: c.slug,
		name: c.name,
		subtitle: c.subtitle,
		picture: c.picture,
		experienceCount: c._count.experiences,
	}));
}

const features = [
	{
		icon: <Compass className="size-6" />,
		title: "Curated by locals",
		description: "Every experience is designed and led by trusted hosts who know the hidden corners of their cities.",
	},
	{
		icon: <Sparkles className="size-6" />,
		title: "High-quality standards",
		description: "We personally vet each host, review their spaces, and monitor guest feedback to keep excellence high.",
	},
	{
		icon: <Users className="size-6" />,
		title: "Intimate group sizes",
		description: "No giant tours here—just small groups and meaningful conversations that feel like old friends.",
	},
];

const hosts: Host[] = [
	{
		id: "1",
		name: "Maya Chen",
		headline: "Ceramic artist & tea storyteller",
		bio: "Maya welcomes you into her mountain studio to explore clay, tea rituals, and the history of her craft community.",
		experiencesHosted: 220,
		rating: 4.97,
	},
	{
		id: "2",
		name: "Gabriel Ortiz",
		headline: "Sound healer & nature guide",
		bio: "Experience twilight sound baths in a secret canyon while Gabriel shares indigenous instruments and techniques.",
		experiencesHosted: 148,
		rating: 4.93,
	},
];

const testimonials: Testimonial[] = [
	{
		id: "1",
		quote: "It felt like being invited to a friend's gathering. The attention to detail and warmth from the hosts were unforgettable.",
		name: "Priya",
		role: "Traveled with friends",
		rating: 5,
	},
	{
		id: "2",
		quote: "Together made planning our family reunion effortless. Every experience exceeded expectations and sparked fresh connections.",
		name: "Derrick",
		role: "Family organizer",
		rating: 5,
	},
];

// Removed stats content as stats section is being removed

type CarouselGroup = {
	key: string;
	title: string;
	experiences: Experience[];
};

function getUpcomingWeekendRange(reference = new Date()) {
	const now = new Date(reference);
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);

	const day = start.getDay();
	if (day <= 5) {
		start.setDate(start.getDate() + (5 - day));
	} else if (day === 6) {
		start.setDate(start.getDate() - 1);
	} else {
		start.setDate(start.getDate() - 2);
	}

	const end = new Date(start);
	end.setDate(end.getDate() + 2);
	end.setHours(23, 59, 59, 999);

	if (end < now) {
		start.setDate(start.getDate() + 7);
		end.setDate(end.getDate() + 7);
	}

	return { start, end } as const;
}

async function loadCarouselGroups(): Promise<CarouselGroup[]> {
	const now = new Date();
	const { end: weekendEnd } = getUpcomingWeekendRange(now);

	const groups: {
		key: string;
		title: string;
		where: Prisma.ExperienceWhereInput;
		orderBy: Prisma.ExperienceOrderByWithRelationInput[];
		take: number;
	}[] = [
		{
			key: "tangier",
			title: "Tangier experiences",
			where: {
				heroImage: { not: null },
				OR: [{ meetingCity: { equals: "Tangier" } }, { location: { contains: "Tangier", mode: "insensitive" } }],
			},
			orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
			take: 16,
		},
		{
			key: "hangzhou",
			title: "Hangzhou experiences",
			where: {
				heroImage: { not: null },
				OR: [{ meetingCity: { equals: "Hangzhou" } }, { location: { contains: "Hangzhou", mode: "insensitive" as const } }],
			},
			orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
			take: 16,
		},
		{
			key: "city",
			title: "Experiences by city",
			where: {
				heroImage: { not: null },
				meetingCity: { not: null },
			},
			orderBy: [{ meetingCity: "asc" }, { averageRating: "desc" }, { createdAt: "desc" }],
			take: 16,
		},
		{
			key: "weekend",
			title: "This weekend's highlights",
			where: {
				heroImage: { not: null },
				sessions: {
					some: {
						startAt: {
							gte: now,
							lte: weekendEnd,
						},
					},
				},
			},
			orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
			take: 16,
		},
	];

	const results = await Promise.all(
		groups.map((group) =>
			prisma.experience.findMany({
				select: experienceCardSelect,
				where: { AND: [group.where, { status: "PUBLISHED" }] },
				orderBy: group.orderBy,
				take: group.take,
			})
		)
	);

	const output: CarouselGroup[] = [];
	groups.forEach((group, index) => {
		const experiences = results[index]?.map(mapExperienceToCard) ?? [];
		if (!experiences.length) {
			return;
		}
		output.push({
			key: group.key,
			title: group.title,
			experiences,
		});
	});
	return output;
}

export default async function Home() {
	const [featuredRaw, carouselGroups, categories] = await Promise.all([
		prisma.experience.findMany({
			select: experienceCardSelect,
			where: { status: "PUBLISHED" },
			orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
			take: 12,
		}),
		loadCarouselGroups(),
		loadCategoriesForCarousel(),
	]);

	const experiences = featuredRaw.map(mapExperienceToCard);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<StickySearchSection />
			<div className="relative overflow-hidden mt-12">
				<div className="pointer-events-none absolute inset-x-0 top-[-20%] z-[-1] h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl" />
				<main className="space-y-24 pb-24">
					{categories.length ? (
						<section>
							<Container className="space-y-8">
								<div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
									<div className="flex snap-x snap-mandatory gap-4 sm:gap-4 md:gap-4">
										{categories.map((c) => (
											<Link
												key={c.id}
												href={`/categories/${c.slug}`}
												className="group/item relative aspect-[3/4] w-32 flex-none overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:w-40 md:w-48 snap-start"
											>
												<div
													className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover/item:scale-105"
													style={{ backgroundImage: `url(${c.picture})` }}
												/>
												<div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/40" />
												<div className="absolute left-3 right-3 top-3 flex flex-col gap-1">
													<span className="w-fit px-0 py-0 text-lg font-extrabold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
														{c.name}
													</span>
													{c.subtitle ? (
														<span className="line-clamp-2 max-w-[85%] text-xs font-medium leading-snug text-white/90 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
															{c.subtitle}
														</span>
													) : null}
												</div>
											</Link>
										))}
									</div>
								</div>
							</Container>
						</section>
					) : null}
					{carouselGroups.length ? (
						<section className="scroll-mt-28">
							<Container className="space-y-12">
								<div className="space-y-16">
									{carouselGroups.map((group) => (
										<ExperienceCarousel key={group.key} title={group.title} experiences={group.experiences} />
									))}
								</div>
							</Container>
						</section>
					) : null}
				</main>
				<NewsletterSection />
			</div>
		</div>
	);
}
