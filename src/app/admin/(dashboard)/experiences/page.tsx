import Link from "next/link";
import { Eye, Pencil, RefreshCcw, User } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { prisma } from "@/lib/prisma";
import type { Prisma, $Enums } from "@/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { EditExperienceModal } from "@/components/organizer/edit-experience-modal";
import { ExperiencesFilters } from "@/components/admin/experiences-filters";
import { ExperiencesPagination } from "../../../../components/admin/experiences-pagination";
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
	const page = normalizeNumberParam(resolved["page"], 1);
	const pageSize = clampPageSize(normalizeNumberParam(resolved["pageSize"], 10));

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

	const total = await prisma.experience.count({ where });

	const experiences = await prisma.experience.findMany({
		where,
		orderBy: { updatedAt: "desc" },
		take: pageSize,
		skip: (page - 1) * pageSize,
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
				<ExperiencesFilters
					initialVerification={verificationQuery}
					initialStatus={statusQuery}
					initialQuery={normalizeStringParam(resolved["q"]) ?? null}
					initialPageSize={pageSize}
				/>
			}
		>
			<TableContainer>
				<Table minWidth={900}>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Title</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Verification</TableHead>
							<TableHead>Publish</TableHead>
							<TableHead>Creat./Updated</TableHead>
							<TableHead>Actions</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
						{experiences.length === 0 ? (
							<TableEmpty colSpan={9}>No experiences found.</TableEmpty>
						) : (
							experiences.map((exp) => (
								<TableRow key={exp.id}>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium text-foreground">{exp.title}</span>
											<span className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
												<User className="size-3.5" />
												<span className="truncate max-w-[360px]">
													{exp.organizer?.name ?? "Unknown"}, {exp.country?.name ?? "—"}
												</span>
											</span>
										</div>
									</TableCell>
									<TableCell>
										<span className="text-foreground">{exp.category ?? "—"}</span>
									</TableCell>
									<TableCell>
										<VerificationBadge value={exp.verificationStatus} />
									</TableCell>
									<TableCell>
										<StatusBadge value={exp.status} />
									</TableCell>
									<TableCell>
										<div className="flex flex-col leading-tight">
											<span className="text-[12px] text-muted-foreground">{dateFmt.format(exp.createdAt)}</span>
											<span className="mt-0.5 inline-flex items-center gap-1 text-[12px]">
												<RefreshCcw className="size-3.5 text-muted-foreground" />
												<span className="text-muted-foreground">{formatDistanceToNowStrict(exp.updatedAt, { addSuffix: true })}</span>
											</span>
										</div>
									</TableCell>
									<TableCell className="px-2 py-2">
										<div className="flex items-center gap-1.5">
											<CtaIconButton asChild color="whiteBorder" size="md" ariaLabel="Preview">
												<Link href={`/experiences/${exp.slug}`} target="_blank" rel="noreferrer">
													<Eye />
												</Link>
											</CtaIconButton>
											<EditExperienceModal
												experienceId={exp.id}
												color="whiteBorder"
												size="icon"
												initialStep={0}
												enableVerification
												aria-label="Edit experience"
											>
												<Pencil />
											</EditExperienceModal>
											<ExperiencesActions experienceId={exp.id} bookingsCount={exp._count.bookings} reviewsCount={exp._count.reviews} />
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				<ExperiencesPagination page={page} pageSize={pageSize} total={total} />
			</TableContainer>
		</ConsolePage>
	);
}

function normalizeStringParam(value: string | string[] | undefined): string | null {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
	return null;
}

function normalizeNumberParam(value: string | string[] | undefined, fallback: number): number {
	const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampPageSize(size: number): number {
	if (size <= 10) return 10;
	if (size <= 20) return 20;
	return 50;
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
