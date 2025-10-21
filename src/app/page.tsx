import Link from "next/link";
import type { Prisma } from "@/generated/prisma";
import { Camera, ChefHat, Compass, Flame, Heart, Palette, Sparkles, Users, Waves, Wine } from "lucide-react";

import { ExperienceCard, type Experience } from "@/components/cards/experience-card";
import { FeatureCard } from "@/components/cards/feature-card";
import { HostCard, type Host } from "@/components/cards/host-card";
import { CategoryCard, type Category } from "@/components/cards/category-card";
// Removed StatCard import as stats section is being removed
import { TestimonialCard, type Testimonial } from "@/components/cards/testimonial-card";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StickySearchSection from "@/components/experiences/sticky-search-section";
import { ExperienceCarousel } from "@/components/experiences/experience-carousel";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import { defaultFaqs } from "@/data/faqs";

const categories: Category[] = [
	{
		id: "culinary",
		name: "Culinary Journeys",
		description: "Cook side-by-side with local chefs and taste stories passed down for generations.",
		icon: <ChefHat className="size-6" />,
		experiences: 142,
	},
	{
		id: "adventure",
		name: "Adventure Escapes",
		description: "Guided hikes, surf lessons, and adrenaline-filled memories in breathtaking settings.",
		icon: <Waves className="size-6" />,
		experiences: 96,
	},
	{
		id: "creative",
		name: "Creative Studios",
		description: "Pottery, printmaking, photography, and more hands-on workshops led by passionate artists.",
		icon: <Palette className="size-6" />,
		experiences: 88,
	},
	{
		id: "wellness",
		name: "Wellness Retreats",
		description: "Meditation escapes, sound baths, and slow living rituals to help you reset.",
		icon: <Heart className="size-6" />,
		experiences: 75,
	},
];

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
	const [featuredRaw, carouselGroups] = await Promise.all([
		prisma.experience.findMany({
			select: experienceCardSelect,
			where: { status: "PUBLISHED" },
			orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
			take: 12,
		}),
		loadCarouselGroups(),
	]);

	const experiences = featuredRaw.map(mapExperienceToCard);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<StickySearchSection />
			<div className="relative overflow-hidden mt-12">
				<div className="pointer-events-none absolute inset-x-0 top-[-20%] z-[-1] h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl" />
				<main className="space-y-24 pb-24">
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

					<section id="hosts" className="scroll-mt-28">
						<Container className="space-y-12">
							<SectionHeading
								eyebrow="Meet the hosts"
								title="Stories from the people who make Kamleen special"
								description="Hosts open their studios, kitchens, and neighborhoods so you can experience the magic of their everyday."
							/>
							<div className="grid gap-6 md:grid-cols-2">
								{hosts.map((host) => (
									<HostCard key={host.id} host={host} />
								))}
							</div>
						</Container>
					</section>
				</main>
			</div>
		</div>
	);
}
