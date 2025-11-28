import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";

import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Eye } from "lucide-react";
import { OrganizerRequestActions } from "@/components/admin/organizer-request-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export default async function AdminOrganizersPage() {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.activeRole !== "ADMIN") {
		return null;
	}

	const applicants = await prisma.user.findMany({
		where: { organizerStatus: { not: "NOT_APPLIED" } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			gender: true,
			birthDate: true,
			headline: true,
			bio: true,
			createdAt: true,
			role: true,
			organizerStatus: true,
		},
	});

	return (
		<ConsolePage title="Organizer requests" subtitle="Review and approve explorers applying to become organizers.">
			<TableContainer>
				<Table minWidth={720}>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Applicant</TableHead>
							<TableHead>Submitted</TableHead>
							<TableHead>Organizer status</TableHead>
							<TableHead>Actions</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
						{applicants.length === 0 ? (
							<TableEmpty colSpan={4}>No organizer requests.</TableEmpty>
						) : (
							applicants.map((applicant) => {
								const submittedAt = applicant.createdAt;
								return (
									<TableRow key={applicant.id} className="align-top">
										<TableCell className="px-4 py-4">
											<div className="flex flex-col gap-1">
												<span className="font-medium text-foreground">{applicant.name ?? applicant.email}</span>
												<span className="text-xs text-muted-foreground">{applicant.email}</span>
											</div>
										</TableCell>
										<TableCell className="px-4 py-4">
											<div className="flex flex-col text-xs text-muted-foreground">
												<span>{submittedAt.toLocaleDateString("en")}</span>
												<span className="mt-1">Received {formatDistanceToNowStrict(submittedAt, { addSuffix: true })}</span>
											</div>
										</TableCell>
										<TableCell className="px-4 py-4">
											<OrganizerStatusBadge value={applicant.organizerStatus as string} />
										</TableCell>
										<TableCell className="px-4 py-4">
											<div className="flex flex-row gap-3">
												<div className="flex flex-wrap gap-2">
													<CtaIconButton asChild size="md" color="whiteBorder" ariaLabel="View user">
														<Link href={`/admin/users/${applicant.id}`}>
															<Eye />
														</Link>
													</CtaIconButton>
												</div>
												{applicant.organizerStatus === "PENDING" ? (
													<OrganizerRequestActions
														userId={applicant.id}
														userRole={applicant.role}
														name={applicant.name}
														email={applicant.email}
														image={applicant.image}
														gender={applicant.gender as string | null}
														birthDate={applicant.birthDate as Date | null}
														headline={applicant.headline}
														bio={applicant.bio}
														status={applicant.organizerStatus}
													/>
												) : null}
											</div>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</ConsolePage>
	);
}

// no draft/verification badges in the simplified organizer request list
function OrganizerStatusBadge({ value }: { value: string }) {
	const label = value.toLowerCase().replace(/_/g, " ");
	let variation: "success" | "warning" | "danger" | "outline" = "outline";
	if (value === "APPROVED") variation = "success";
	else if (value === "PENDING") variation = "warning";
	else if (value === "REJECTED") variation = "danger";
	return <StatusBadge value={label} variation={variation} />;
}
