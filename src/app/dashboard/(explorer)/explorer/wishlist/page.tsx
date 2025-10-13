import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { experienceCardSelect, mapExperienceToCard } from "@/lib/experiences";
import { ExperienceCard } from "@/components/cards/experience-card";
import { ConsolePage } from "@/components/console/page";

export default async function ExplorerWishlistPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const wishlistRaw = await prisma.experience.findMany({
		where: { savedBy: { some: { id: session.user.id } } },
		select: experienceCardSelect,
		orderBy: { createdAt: "desc" },
	});

	const wishlist = wishlistRaw.map(mapExperienceToCard);

	return (
		<ConsolePage title="Your wishlist" subtitle="Keep track of experiences you love and plan future trips.">
			{wishlist.length ? (
				<div className="grid gap-6 md:grid-cols-3">
					{wishlist.map((experience) => (
						<ExperienceCard key={experience.id} experience={experience} />
					))}
				</div>
			) : (
				<p>You haven&apos;t added any experiences to your wishlist yet.</p>
			)}
		</ConsolePage>
	);
}
