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

	return (
		<ConsolePage title="Experiences verification" subtitle="Review submissions, approve or reject with notes.">
			<div className="space-y-4">
				{experiences.length ? (
					experiences.map((exp) => (
						<Card key={exp.id} className="border-border/60 bg-card/80 shadow-sm">
							<CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h3 className="text-base font-semibold text-foreground">{exp.title}</h3>
									<p className="text-xs text-muted-foreground">Verification: {exp.verificationStatus.toLowerCase().replace(/_/g, " ")}</p>
									{exp.verificationNote ? <p className="text-xs text-amber-600">Note: {exp.verificationNote}</p> : null}
								</div>
								<div className="flex items-center gap-2">
									<EditExperienceModal experienceId={exp.id} variant="outline" size="sm" initialStep={0} enableVerification>
										Review details
									</EditExperienceModal>
									<VerifyActions experienceId={exp.id} />
								</div>
							</CardHeader>
						</Card>
					))
				) : (
					<Card className="border-dashed border-border/60 bg-card/60">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">No submissions at the moment.</CardContent>
					</Card>
				)}
			</div>
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
