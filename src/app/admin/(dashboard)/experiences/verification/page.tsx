import { ConsolePage } from "@/components/console/page";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";

export default async function AdminExperiencesVerificationPage() {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.activeRole !== "ADMIN") return null;

	const experiences = await prisma.experience.findMany({
		where: { verificationStatus: { in: ["PENDING", "REJECTED", "NOT_SUBMITTED"] } },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			title: true,
			slug: true,
			verificationStatus: true,
			verificationNote: true,
			status: true,
		},
	});

	// Temporary: keep old page rendering a minimal note and a link to the new listing.
	return (
		<ConsolePage title="Experiences" subtitle="This view moved. Use the main listing to filter and verify.">
			<Card className="border-dashed border-border/60 bg-card/60">
				<CardContent className="py-6 text-sm text-muted-foreground">
					The verification workflow now lives in the Experiences table. Use the Verify action there.
				</CardContent>
			</Card>
		</ConsolePage>
	);
}

function VerifyActions({ experienceId }: { experienceId: string }) {
	async function approve() {
		"use server";
		// server action placeholder; actual approval via modal verification step
	}
	return (
		<EditExperienceModal experienceId={experienceId} variant="default" size="sm" initialStep={5} enableVerification>
			Open verification
		</EditExperienceModal>
	);
}
