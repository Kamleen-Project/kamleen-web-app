import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { ExperienceSearchForm } from "@/components/experiences/experience-search-form";
import { ExperienceGrid, ExperienceGridSkeleton } from "@/components/experiences/experience-grid";
import { prisma } from "@/lib/prisma";
import { buildExperienceWhere, experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";

const PAGE_SIZE = 6;

type ExperiencesPageProps = {
	searchParams: Promise<{
		q?: string;
		start?: string;
		guests?: string;
		location?: string;
	}>;
};

export default async function ExperiencesPage({ searchParams }: ExperiencesPageProps) {
	const resolvedSearchParams = await searchParams;

	const filters = {
		query: resolvedSearchParams.q ?? resolvedSearchParams.location ?? null,
		location: resolvedSearchParams.location ?? null,
		startDate: resolvedSearchParams.start ?? null,
		guests: resolvedSearchParams.guests ? Number.parseInt(resolvedSearchParams.guests, 10) || null : null,
	};

	const where = buildExperienceWhere(filters);

	const [list, total] = await Promise.all([
		prisma.experience.findMany({
			where: { AND: [where, { status: "PUBLISHED" }] },
			orderBy: { createdAt: "desc" },
			take: PAGE_SIZE,
			select: experienceCardSelect,
		}),
		prisma.experience.count({ where: { AND: [where, { status: "PUBLISHED" }] } }),
	]);

	const experiences = list.map(mapExperienceToCard);
	const hasMore = PAGE_SIZE < total;

	const initialValues = {
		q: resolvedSearchParams.q ?? "",
		start: resolvedSearchParams.start ?? "",
		guests: resolvedSearchParams.guests ?? "",
	};

	const queryObject = Object.fromEntries(
		Object.entries({
			q: resolvedSearchParams.q,
			start: resolvedSearchParams.start,
			guests: resolvedSearchParams.guests,
		}).filter(([, value]) => Boolean(value))
	);

	return (
		<div className="bg-muted/20 py-16">
			<Container className="space-y-12">
				<div className="space-y-8">
					<SectionHeading
						eyebrow="Explore experiences"
						title="Curated activities designed for connection"
						description="Browse immersive gatherings hosted by trusted organizers around the globe. Use the filters to find the perfect session for your crew."
						align="center"
					/>

					<div className="relative z-20">
						<ExperienceSearchForm initialValues={initialValues} />
					</div>
				</div>

				<Suspense fallback={<ExperienceGridSkeleton />}>
					{" "}
					{/* Suspense for future streaming */}
					<ExperienceGrid initialExperiences={experiences} initialHasMore={hasMore} searchParams={queryObject} />
				</Suspense>
			</Container>
		</div>
	);
}
