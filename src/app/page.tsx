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
import { ExperienceSearchForm } from "@/components/experiences/experience-search-form";
import { ExperienceCarousel } from "@/components/experiences/experience-carousel";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";

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

const faqs = [
	{
		question: "How do I book an experience?",
		answer: "Choose your date, confirm group size, and reserve instantly. Your host will reach out within 24 hours with final details.",
	},
	{
		question: "Can I host my own experience?",
		answer: "We look for thoughtful storytellers with a unique perspective. Apply to host and our curation team will guide you through the process.",
	},
	{
		question: "What is your cancellation policy?",
		answer: "Plans change—we get it. Enjoy free cancellations up to 72 hours before your experience begins, unless noted otherwise.",
	},
];

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
			<div className="relative overflow-hidden">
				<div className="pointer-events-none absolute inset-x-0 top-[-20%] z-[-1] h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl" />

				<header className="py-6 sm:py-8">
					<Container className="flex flex-col items-center gap-4 text-center">
						<div className="w-full max-w-5xl space-y-3">
							<ExperienceSearchForm />
						</div>
					</Container>
				</header>

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

					<section id="discover" className="scroll-mt-28">
						<Container className="space-y-12">
							<SectionHeading
								eyebrow="Curated collections"
								title="Choose the vibe for your next gathering"
								description="Explore hand-picked categories designed for different moods, group sizes, and travel styles."
							/>
							<div className="grid gap-6 md:grid-cols-2">
								{categories.map((category) => (
									<CategoryCard key={category.id} category={category} />
								))}
							</div>
						</Container>
					</section>

					<section className="scroll-mt-28">
						<Container className="space-y-12">
							<SectionHeading
								eyebrow="Featured this week"
								title="Experiences guests are loving right now"
								description="Reserve verified experiences created by passionate hosts around the globe."
							/>
							<div className="grid gap-6 md:grid-cols-4">
								{experiences.length ? (
									experiences.map((experience) => <ExperienceCard key={experience.id} experience={experience} />)
								) : (
									<div className="md:col-span-4">
										<p className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
											Stay tuned—new experiences are being curated. Check back soon or switch to the organizer role to create one now.
										</p>
									</div>
								)}
							</div>
						</Container>
					</section>

					<section id="why" className="scroll-mt-28">
						<Container className="space-y-12">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
								<SectionHeading
									eyebrow="Why Kamleen"
									title="Designing unforgettable moments is our craft"
									description="From the first message to the final goodbye, every touchpoint is considered so you can stay present with your people."
								/>
								<Button variant="secondary" className="self-start">
									Learn about our vetting process
								</Button>
							</div>
							<div className="grid gap-6 md:grid-cols-3">
								{features.map((feature) => (
									<FeatureCard key={feature.title} icon={feature.icon} title={feature.title} description={feature.description} />
								))}
							</div>
						</Container>
					</section>

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

					<section id="stories" className="scroll-mt-28 bg-muted/40 py-20">
						<Container className="space-y-12">
							<SectionHeading
								eyebrow="Guest reflections"
								title="Loved by communities, teams, and lifelong learners"
								description="Hear how Together experiences helped groups reconnect, celebrate, and grow."
								align="center"
							/>
							<div className="grid gap-6 md:grid-cols-2">
								{testimonials.map((testimonial) => (
									<TestimonialCard key={testimonial.id} testimonial={testimonial} />
								))}
							</div>
						</Container>
					</section>

					<section>
						<Container className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
							<div className="space-y-6">
								<SectionHeading
									eyebrow="For planners"
									title="Design your itinerary in a few clicks"
									description="Build collections, coordinate with co-hosts, and track RSVPs from a single workspace."
								/>
								<ul className="space-y-4 text-sm text-muted-foreground">
									<li className="flex items-start gap-3">
										<Camera className="mt-1 size-4 text-primary" />
										Capture highlights with collaborative photo drops for your group.
									</li>
									<li className="flex items-start gap-3">
										<Flame className="mt-1 size-4 text-primary" />
										Unlock surprise add-ons—from private chefs to sunset DJ sets—curated for your theme.
									</li>
									<li className="flex items-start gap-3">
										<Wine className="mt-1 size-4 text-primary" />
										Let hosts handle logistics and ingredients so you can focus on being together.
									</li>
								</ul>
								<div className="flex flex-wrap gap-3">
									<Button>Start building a collection</Button>
									<Button variant="ghost" className="text-primary">
										Talk with a curator
									</Button>
								</div>
							</div>
							<div className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-xl backdrop-blur">
								<h3 className="text-xl font-semibold">Plan with confidence</h3>
								<p className="mt-3 text-sm text-muted-foreground">
									We’ll match you with a dedicated curator who understands your group’s personality and budget.
								</p>
								<div className="mt-6 space-y-4">
									<div className="flex items-center gap-3">
										<Badge variant="soft" className="text-xs">
											24-hour support
										</Badge>
										<p className="text-sm text-muted-foreground">Real humans ready when plans change.</p>
									</div>
									<div className="flex items-center gap-3">
										<Badge variant="soft" className="text-xs">
											Flexible payments
										</Badge>
										<p className="text-sm text-muted-foreground">Split costs, pay later, or invoice teams.</p>
									</div>
									<div className="flex items-center gap-3">
										<Badge variant="soft" className="text-xs">
											Trusted partners
										</Badge>
										<p className="text-sm text-muted-foreground">Insured hosts and vetted venues worldwide.</p>
									</div>
								</div>
							</div>
						</Container>
					</section>

					<section className="bg-primary text-primary-foreground">
						<Container className="flex flex-col gap-10 py-20 text-center">
							<SectionHeading
								eyebrow="Join the community"
								title="Host experiences that spark meaningful connection"
								description="Share your craft, passion, or neighborhood. We’ll help you design unforgettable gatherings and handle the logistics."
								align="center"
							/>
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Button variant="secondary" className="h-12 px-6">
									Apply to become a host
								</Button>
								<Button variant="ghost" className="h-12 px-6 text-primary-foreground">
									Download hosting guide
								</Button>
							</div>
						</Container>
					</section>

					<section>
						<Container className="space-y-10">
							<div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
								<div className="space-y-6">
									<SectionHeading
										eyebrow="FAQ"
										title="Answers before you pack your bags"
										description="Can’t find what you’re looking for? Message us anytime—we’re travelers too."
									/>
									<div className="space-y-6">
										{faqs.map((faq) => (
											<div key={faq.question} className="space-y-2">
												<h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
												<p className="text-sm text-muted-foreground">{faq.answer}</p>
											</div>
										))}
									</div>
								</div>
								<div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/80 p-8 shadow-md">
									<div>
										<h3 className="text-xl font-semibold text-foreground">Stay in the loop</h3>
										<p className="mt-2 text-sm text-muted-foreground">Receive monthly city guides, host highlights, and early access to limited experiences.</p>
									</div>
									<form className="space-y-4">
										<Input placeholder="Email address" className="h-11 text-base" type="email" required />
										<Button className="w-full">Subscribe</Button>
										<p className="text-xs text-muted-foreground">By subscribing, you agree to receive updates from Kamleen. You can unsubscribe anytime.</p>
									</form>
								</div>
							</div>
						</Container>
					</section>
				</main>
			</div>
		</div>
	);
}
