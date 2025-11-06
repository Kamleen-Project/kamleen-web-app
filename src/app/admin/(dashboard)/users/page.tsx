import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { UsersActions } from "@/components/admin/users-actions";
import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import type { Prisma, $Enums } from "@/generated/prisma";
import { UsersFilters } from "@/components/admin/users-filters";
import { CtaIconButton } from "@/components/ui/cta-icon-button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
	const resolved = (await searchParams) ?? {};
	const roleQuery = normalizeStringParam(resolved["role"]) ?? "__ALL__";
	const organizerQuery = normalizeStringParam(resolved["organizer"]) ?? "__ALL__";
	const q = normalizeStringParam(resolved["q"])?.trim() || null;

	// Exclude admins and optionally filter by role/organizer
	const allowedRoles: $Enums.UserRole[] = ["EXPLORER", "ORGANIZER"];
	const roleFilter = roleQuery !== "__ALL__" && (roleQuery === "EXPLORER" || roleQuery === "ORGANIZER") ? (roleQuery as $Enums.UserRole) : undefined;

	const where: Prisma.UserWhereInput = {
		...(roleFilter ? { role: roleFilter } : { role: { in: allowedRoles } }),
		...(organizerQuery !== "__ALL__" ? { organizerStatus: organizerQuery as $Enums.OrganizerStatus } : {}),
		...(q
			? {
					OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
			  }
			: {}),
	};

	const users = await prisma.user.findMany({
		where,
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			activeRole: true,
			organizerStatus: true,
			accountStatus: true,
			createdAt: true,
			_count: { select: { experienceBookings: true, experiences: true } },
		},
	});

	return (
		<ConsolePage
			title="Account directory"
			subtitle="Manage everyone using Kamleen."
			action={
				<div className="flex w-full items-center gap-2 md:w-auto">
					<UsersFilters initialRole={roleQuery} initialOrganizer={organizerQuery} initialQuery={normalizeStringParam(resolved["q"]) ?? null} />
				</div>
			}
		>
			<TableContainer>
				<Table minWidth={900}>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Name</TableHead>
							<TableHead>Res.</TableHead>
							<TableHead>Exp.</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Organizer</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Joined</TableHead>
							<TableHead>Actions</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
						{users.length === 0 ? (
							<TableEmpty colSpan={9}>No users found.</TableEmpty>
						) : (
							users.map((user) => {
								const primary = user.name ?? user.email ?? "—";
								const secondaryEmail = user.email && user.email !== primary ? user.email : null;
								return (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex flex-col">
												<span className="font-medium text-foreground">{primary}</span>
												{secondaryEmail ? <span className="mt-1 text-[12px] text-muted-foreground">{secondaryEmail}</span> : null}
											</div>
										</TableCell>
										<TableCell>{user._count.experienceBookings}</TableCell>
										<TableCell>{user._count.experiences}</TableCell>
										<TableCell>
											<Badge variant="outline" className="text-xs uppercase">
												{user.role.toLowerCase()}
											</Badge>
										</TableCell>
										<TableCell>
											<OrganizerStatusBadge value={user.organizerStatus} />
										</TableCell>
										<TableCell>
											<AccountStatusBadge value={user.accountStatus} />
										</TableCell>
										<TableCell>
											<span className="text-[12px] text-muted-foreground">{formatDistanceToNowStrict(user.createdAt, { addSuffix: true })}</span>
										</TableCell>
										<TableCell className="px-2 py-2">
											<div className="flex items-center gap-1.5">
												<CtaIconButton asChild color="whiteBorder" size="md" ariaLabel="Edit user">
													<Link href={`/admin/users/${user.id}`}>
														<Pencil />
													</Link>
												</CtaIconButton>
												<UsersActions userId={user.id} experiencesCount={user._count.experiences} bookingsCount={user._count.experienceBookings} />
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

function normalizeStringParam(value: string | string[] | undefined): string | null {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
	return null;
}

function OrganizerStatusBadge({ value }: { value: string }) {
	const label = value.toLowerCase().replace(/_/g, " ");
	if (value === "APPROVED") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "PENDING") return <Badge className="bg-amber-500 text-white border-transparent">{label}</Badge>;
	if (value === "REJECTED") return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
	return (
		<Badge variant="outline" className="text-xs uppercase">
			{label}
		</Badge>
	);
}

function AccountStatusBadge({ value }: { value: string }) {
	const label = value.toLowerCase().replace(/_/g, " ");
	if (value === "ACTIVE") return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
	if (value === "PENDING_VERIFICATION") return <Badge className="bg-amber-500 text-white border-transparent">{"pending"}</Badge>;
	if (value === "ONBOARDING") return <Badge className="bg-sky-600 text-white border-transparent">{label}</Badge>;
	if (value === "INACTIVE")
		return (
			<Badge variant="outline" className="text-xs uppercase">
				{label}
			</Badge>
		);
	if (value === "BANNED") return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
	if (value === "ARCHIVED") return <Badge className="bg-slate-600 text-white border-transparent">{label}</Badge>;
	return (
		<Badge variant="outline" className="text-xs uppercase">
			{label}
		</Badge>
	);
}
