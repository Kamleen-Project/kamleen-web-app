import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { ExperienceWizard } from "@/components/organizer/experience-wizard";

type PageProps = {
	params: Promise<{
		experienceId: string;
	}>;
};

export default async function OrganizerExperienceEditPage({ params }: PageProps) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const { experienceId } = await params;

	const [experience, categoriesRaw, countriesRaw] = await Promise.all([
		prisma.experience.findFirst({
			where: { id: experienceId, organizerId: session.user.id },
			select: {
				id: true,
				slug: true,
				title: true,
				summary: true,
				description: true,
				location: true,
				duration: true,
				price: true,
				currency: true,
				category: true,
				tags: true,
				heroImage: true,
				galleryImages: true,
				meetingAddress: true,
				meetingCity: true,
				meetingCountry: true,
				meetingLatitude: true,
				meetingLongitude: true,
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
					select: {
						id: true,
						title: true,
						subtitle: true,
						image: true,
						order: true,
					},
				},
			},
		}),
		prisma.experienceCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
		prisma.country.findMany({
			orderBy: { name: "asc" },
			include: {
				states: {
					orderBy: { name: "asc" },
					include: {
						cities: { orderBy: { name: "asc" }, select: { id: true, name: true, latitude: true, longitude: true } },
					},
				},
				cities: {
					where: { stateId: null },
					orderBy: { name: "asc" },
					select: { id: true, name: true, latitude: true, longitude: true },
				},
			},
		}),
	]);

	if (!experience) {
		notFound();
	}

	const initialData = {
		id: experience.id,
		title: experience.title,
		summary: experience.summary,
		description: experience.description,
		category: experience.category ?? "general",
		duration: experience.duration,
		price: experience.price,
		currency: experience.currency,
		tags: experience.tags,
		location: experience.location,
		heroImage: experience.heroImage,
		galleryImages: experience.galleryImages ?? [],
		meeting: {
			address: experience.meetingAddress,
			city: experience.meetingCity,
			country: experience.meetingCountry,
			latitude: experience.meetingLatitude ? Number(experience.meetingLatitude) : null,
			longitude: experience.meetingLongitude ? Number(experience.meetingLongitude) : null,
		},
		itinerary: experience.itinerarySteps.map((step) => ({
			id: step.id,
			title: step.title,
			subtitle: step.subtitle,
			image: step.image,
			order: step.order,
		})),
		sessions: experience.sessions.map((session) => ({
			id: session.id,
			startAt: session.startAt.toISOString(),
			capacity: session.capacity,
			priceOverride: session.priceOverride,
			locationLabel: session.locationLabel,
			meetingAddress: session.meetingAddress,
			reservedGuests: Array.isArray(session.bookings) ? session.bookings.reduce((acc, b) => acc + (b.guests || 0), 0) : 0,
		})),
	};

	const categories = categoriesRaw;
	const countries = countriesRaw.map((country) => ({
		id: country.id,
		name: country.name,
		states: country.states.map((state) => ({
			id: state.id,
			name: state.name,
			cities: state.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
		})),
		cities: country.cities.map((city) => ({ id: city.id, name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude) })),
	}));

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold text-foreground">Edit experience</h1>
				<p className="text-sm text-muted-foreground">Refresh details, imagery, and schedules before publishing updates.</p>
			</div>
			<div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-sm">
				<ExperienceWizard mode="edit" experienceId={experience.id} initialData={initialData} categories={categories} countries={countries} />
			</div>
		</div>
	);
}
