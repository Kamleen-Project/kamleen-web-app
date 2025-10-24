import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";

import { ConsolePage } from "@/components/console/page";
import { Badge } from "@/components/ui/badge";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Eye, Pencil } from "lucide-react";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";
import { OrganizerRequestActions } from "@/components/admin/organizer-request-actions";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export default async function AdminOrganizersPage() {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.activeRole !== "ADMIN") {
		return null;
	}

	const applicants = await prisma.user.findMany({
		where: { organizerStatus: "PENDING" },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			headline: true,
			bio: true,
			createdAt: true,
			role: true,
			activeRole: true,
			experiences: {
				where: { status: { in: ["DRAFT", "UNPUBLISHED", "PUBLISHED"] } },
				orderBy: { createdAt: "desc" },
				take: 1,
				select: {
					id: true,
					title: true,
					status: true,
					verificationStatus: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});

	return (
		<ConsolePage title="Organizer requests" subtitle="Review and approve explorers applying to become organizers.">
			<div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
				<div className="overflow-x-auto">
					<table className="min-w-[920px] w-full text-sm">
						<thead>
							<tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
								<th className="px-4 py-3 font-medium">Applicant</th>
								<th className="px-4 py-3 font-medium">Draft experience</th>
								<th className="px-4 py-3 font-medium">Submitted</th>
								<th className="px-4 py-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{applicants.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
										No pending organizer requests.
									</td>
								</tr>
							) : (
								applicants.map((applicant) => {
									const draft = applicant.experiences[0] ?? null;
									const submittedAt = draft?.createdAt ?? applicant.createdAt;
									return (
										<tr key={applicant.id} className="border-b border-border/50 align-top hover:bg-muted/30">
											<td className="px-4 py-4">
												<div className="flex flex-col gap-1">
													<span className="font-medium text-foreground">{applicant.name ?? applicant.email}</span>
													<span className="text-xs text-muted-foreground">{applicant.email}</span>
													{applicant.headline ? <p className="mt-2 text-sm text-foreground/90">{applicant.headline}</p> : null}
													{applicant.bio ? <p className="line-clamp-2 text-xs text-muted-foreground">{applicant.bio}</p> : null}
												</div>
											</td>
											<td className="px-4 py-4">
												{draft ? (
													<div className="flex flex-col gap-1">
														<span className="font-medium text-foreground">{draft.title || "Untitled experience"}</span>
														<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
															<ExperienceStatusBadge value={draft.status} />
															<VerificationBadge value={draft.verificationStatus} />
														</div>
													</div>
												) : (
													<span className="text-sm text-muted-foreground">No draft linked yet.</span>
												)}
											</td>
											<td className="px-4 py-4">
												<div className="flex flex-col text-xs text-muted-foreground">
													<span>{submittedAt.toLocaleDateString("en")}</span>
													<span className="mt-1">Updated {formatDistanceToNowStrict(draft?.updatedAt ?? submittedAt, { addSuffix: true })}</span>
												</div>
											</td>
											<td className="px-4 py-4">
												<div className="flex flex-col gap-3">
													<div className="flex flex-wrap gap-2">
														{draft ? (
															<EditExperienceModal experienceId={draft.id} enableVerification variant="outline" size="icon" aria-label="Review draft">
																<Pencil className="size-4" />
															</EditExperienceModal>
														) : null}
														<CtaIconButton asChild size="md" color="whiteBorder" ariaLabel="View user">
															<Link href={`/admin/users/${applicant.id}`}>
																<Eye />
															</Link>
														</CtaIconButton>
													</div>
													<OrganizerRequestActions userId={applicant.id} userRole={applicant.role} />
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</ConsolePage>
	);
}

function VerificationBadge({ value }: { value: string }) {
	const label = value.toLowerCase().replace(/_/g, " ");
	if (value === "VERIFIED") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "PENDING") return <Badge className="bg-amber-500 text-white border-transparent">{label}</Badge>;
	if (value === "REJECTED") return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
	return <Badge variant="outline">{label}</Badge>;
}

function ExperienceStatusBadge({ value }: { value: string }) {
	const label = value.toLowerCase();
	if (value === "PUBLISHED") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "DRAFT") return <Badge className="bg-slate-500 text-white border-transparent">{label}</Badge>;
	if (value === "UNPUBLISHED") return <Badge className="bg-amber-500 text-white border-transparent">{label}</Badge>;
	if (value === "UNLISTED") return <Badge variant="soft">{label}</Badge>;
	if (value === "ARCHIVED") return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
	return <Badge variant="outline">{label}</Badge>;
}
