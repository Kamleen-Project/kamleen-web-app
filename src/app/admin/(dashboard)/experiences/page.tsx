import Link from "next/link";
import { Eye, Pencil, RefreshCcw, User } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { ConsolePage } from "@/components/console/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import type { Prisma, $Enums } from "@/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";
import { ExperiencesFilters } from "@/components/admin/experiences-filters";
import { ExperiencesActions } from "@/components/admin/experiences-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// filter option constants moved into ExperiencesFilters component

export default async function AdminExperiencesPage({ searchParams }: { searchParams: SearchParams }) {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.activeRole !== "ADMIN") return null;

	const resolved = (await searchParams) ?? {};
	const verificationQuery = normalizeStringParam(resolved["verification"]) ?? "__ALL__";
	const statusQuery = normalizeStringParam(resolved["status"]) ?? "__ALL__";

	const q = normalizeStringParam(resolved["q"])?.trim() || null;

	const where: Prisma.ExperienceWhereInput = {
		...(verificationQuery !== "__ALL__" ? { verificationStatus: verificationQuery as $Enums.ExperienceVerificationStatus } : {}),
		...(statusQuery !== "__ALL__" ? { status: statusQuery as $Enums.ExperienceStatus } : {}),
		...(q
			? {
					OR: [
						{ title: { contains: q, mode: "insensitive" } },
						{ organizer: { name: { contains: q, mode: "insensitive" } } as unknown as Prisma.UserWhereInput },
					],
			  }
			: {}),
	};

	const experiences = await prisma.experience.findMany({
		where,
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			title: true,
			slug: true,
			category: true,
			averageRating: true,
			reviewCount: true,
			verificationStatus: true,
			status: true,
			updatedAt: true,
			createdAt: true,
			organizer: { select: { id: true, name: true, email: true } },
			country: { select: { name: true } },
			_count: { select: { bookings: true, reviews: true } },
		},
	});

	const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });

	return (
		<ConsolePage
			title="Experiences"
			subtitle="Browse, filter, and verify all experiences in the system."
			action={
				<ExperiencesFilters initialVerification={verificationQuery} initialStatus={statusQuery} initialQuery={normalizeStringParam(resolved["q"]) ?? null} />
			}
		>
			<div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
				<div className="overflow-x-auto">
					<table className="min-w-[900px] w-full text-sm">
						<thead>
							<tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
								<th className="px-4 py-3 font-medium">Title</th>
								<th className="px-4 py-3 font-medium">Category</th>
								<th className="px-4 py-3 font-medium">Verification</th>
								<th className="px-4 py-3 font-medium">Publish</th>
								<th className="px-4 py-3 font-medium">Creat./Updated</th>
								<th className="px-4 py-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{experiences.length === 0 ? (
								<tr>
									<td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
										No experiences found.
									</td>
								</tr>
							) : (
								experiences.map((exp) => (
									<tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30">
										<td className="px-4 py-3">
											<div className="flex flex-col">
												<span className="font-medium text-foreground">{exp.title}</span>
												<span className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
													<User className="size-3.5" />
													<span className="truncate max-w-[360px]">
														{exp.organizer?.name ?? "Unknown"}, {exp.country?.name ?? "—"}
													</span>
												</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className="text-foreground">{exp.category ?? "—"}</span>
										</td>

										<td className="px-4 py-3">
											<VerificationBadge value={exp.verificationStatus} />
										</td>
										<td className="px-4 py-3">
											<StatusBadge value={exp.status} />
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-col leading-tight">
												<span className="text-[12px] text-muted-foreground">{dateFmt.format(exp.createdAt)}</span>
												<span className="mt-0.5 inline-flex items-center gap-1 text-[12px]">
													<RefreshCcw className="size-3.5 text-muted-foreground" />
													<span className="text-muted-foreground">{formatDistanceToNowStrict(exp.updatedAt, { addSuffix: true })}</span>
												</span>
											</div>
										</td>
										<td className="px-2 py-2">
											<div className="flex items-center gap-1.5">
												<Button asChild variant="outline" size="icon" aria-label="Preview">
													<Link href={`/experiences/${exp.slug}`} target="_blank" rel="noreferrer">
														<Eye />
													</Link>
												</Button>
												<EditExperienceModal
													experienceId={exp.id}
													variant="outline"
													size="icon"
													initialStep={0}
													enableVerification
													aria-label="Edit experience"
												>
													<Pencil />
												</EditExperienceModal>
												<ExperiencesActions experienceId={exp.id} bookingsCount={exp._count.bookings} reviewsCount={exp._count.reviews} />
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</ConsolePage>
	);
}

function normalizeStringParam(value: string | string[] | undefined): string | null {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
	return null;
}

function formatPrice(amount: number, currency: string | null | undefined) {
	try {
		return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${amount} ${currency || "USD"}`;
	}
}

function VerificationBadge({ value }: { value: string }) {
	const label = value.toLowerCase().replace(/_/g, " ");
	if (value === "VERIFIED") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "PENDING") return <Badge className="bg-amber-500 text-white border-transparent">{label}</Badge>;
	if (value === "REJECTED") return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
	return <Badge variant="outline">{label}</Badge>;
}

function StatusBadge({ value }: { value: string }) {
	const label = value.toLowerCase();
	if (value === "PUBLISHED") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "DRAFT") return <Badge className="bg-slate-500 text-white border-transparent">{label}</Badge>;
	if (value === "UNPUBLISHED") return <Badge className="bg-amber-500 text-white border-transparent">{label}</Badge>;
	if (value === "UNLISTED") return <Badge variant="soft">{label}</Badge>;
	if (value === "ARCHIVED") return <Badge className="bg-rose-700 text-white border-transparent">{label}</Badge>;
	return <Badge variant="outline">{label}</Badge>;
}
