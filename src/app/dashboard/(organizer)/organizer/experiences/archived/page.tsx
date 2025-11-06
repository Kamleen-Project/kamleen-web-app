import Image from "next/image";
import Link from "next/link";
import { MapPin, Pencil, Eye } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import { Card, CardContent } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";
import CtaIconButton from "@/components/ui/cta-icon-button";

export default async function OrganizerArchivedExperiencesPage() {
	const session = await getServerAuthSession();
	if (!session?.user) return null;

	const experiencesRaw = await prisma.experience.findMany({
		where: { organizerId: session.user.id, status: "ARCHIVED" },
		orderBy: { createdAt: "desc" },
		select: experienceCardSelect,
	});
	const experiences = experiencesRaw.map(mapExperienceToCard);

	return (
		<ConsolePage title="Archived experiences" subtitle="Items moved out of your active workspace.">
			<div className="grid gap-4">
				{experiences.length ? (
					experiences.map((experience) => (
						<Card key={experience.id} className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
							<div className="relative aspect-[16/4] w-full overflow-hidden rounded-xl">
								{experience.image ? (
									<Image src={experience.image} alt={experience.title} fill className="object-cover object-center" sizes="100vw" />
								) : (
									<div className="absolute inset-0 grid place-items-center bg-muted text-xs text-muted-foreground">No image</div>
								)}
							</div>
							<div className="flex items-start justify-between gap-3 p-4">
								<div className="min-w-0">
									<h3 className="truncate text-lg font-semibold text-foreground">{experience.title}</h3>
									<div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
										<MapPin className="size-4" />
										<span className="truncate">{experience.location}</span>
									</div>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<CtaIconButton asChild color="whiteBorder" size="md" ariaLabel="View live">
										<Link href={`/experiences/${experience.slug}`} target="_blank" rel="noopener noreferrer">
											<Eye />
										</Link>
									</CtaIconButton>
									<EditExperienceModal experienceId={experience.id} color="whiteBorder" size="icon">
										<Pencil />
									</EditExperienceModal>
								</div>
							</div>
						</Card>
					))
				) : (
					<Card className="border-dashed border-border/60 bg-card/60">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">No archived experiences.</CardContent>
					</Card>
				)}
			</div>
		</ConsolePage>
	);
}
