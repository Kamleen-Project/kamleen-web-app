import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { ExperienceGrid, ExperienceGridSkeleton } from "@/components/experiences/experience-grid";
import { prisma } from "@/lib/prisma";
import { buildExperienceWhere, experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";

type PageParams = { slug: string };

export default async function CategoryPage({ params }: { params: Promise<PageParams> }) {
	const { slug } = await params;

	const category = await prisma.experienceCategory.findUnique({
		where: { slug },
		select: { id: true, name: true, subtitle: true, picture: true },
	});

	if (!category) {
		return (
			<div className="py-24">
				<Container>
					<div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
						<p className="text-sm text-muted-foreground">Category not found.</p>
					</div>
				</Container>
			</div>
		);
	}

	const PAGE_SIZE = 6;

	const [list, total] = await Promise.all([
		prisma.experience.findMany({
			where: { AND: [{ status: "PUBLISHED" }, { categoryId: category.id }] },
			orderBy: { createdAt: "desc" },
			take: PAGE_SIZE,
			select: experienceCardSelect,
		}),
		prisma.experience.count({ where: { AND: [{ status: "PUBLISHED" }, { categoryId: category.id }] } }),
	]);

	const experiences = list.map(mapExperienceToCard);
	const hasMore = PAGE_SIZE < total;

	const searchParams = { categoryId: category.id };

	return (
		<div className="bg-muted/20">
			<div className="relative isolate">
				<div className="h-56 w-full bg-cover bg-center" style={{ backgroundImage: `url(${category.picture})` }} />
				<div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/0" />
			</div>
			<div className="py-12">
				<Container className="space-y-12">
					<div className="space-y-3 text-center">
						<p className="text-sm font-medium uppercase tracking-wider text-primary">Category</p>
						<h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
						{category.subtitle ? <p className="text-muted-foreground">{category.subtitle}</p> : null}
					</div>

					<Suspense fallback={<ExperienceGridSkeleton />}>
						<ExperienceGrid initialExperiences={experiences} initialHasMore={hasMore} searchParams={searchParams} />
					</Suspense>
				</Container>
			</div>
		</div>
	);
}

