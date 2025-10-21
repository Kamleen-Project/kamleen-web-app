import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersActions } from "@/components/admin/users-actions";
import { ConsolePage } from "@/components/console/page";
import { AdminTable } from "@/components/admin/admin-table";
import type { Prisma, $Enums } from "@/generated/prisma";
import { UsersFilters } from "@/components/admin/users-filters";

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
			subtitle="Search, audit, and manage everyone using Kamleen. Promote trusted explorers to organizers, or escalate accounts that require manual review."
			action={
				<div className="flex w-full items-center gap-2 md:w-auto">
					<UsersFilters initialRole={roleQuery} initialOrganizer={organizerQuery} initialQuery={normalizeStringParam(resolved["q"]) ?? null} />
					<Button asChild variant="outline" className="h-9">
						<Link href="/admin/organizers">Review organizer requests</Link>
					</Button>
				</div>
			}
		>
			<AdminTable
				header={
					<>
						<th className="px-4 py-3 font-medium">Name</th>
						<th className="px-4 py-3 font-medium">Res.</th>
						<th className="px-4 py-3 font-medium">Exp.</th>
						<th className="px-4 py-3 font-medium">Role</th>
						<th className="px-4 py-3 font-medium">Organizer</th>
						<th className="px-4 py-3 font-medium">Status</th>
						<th className="px-4 py-3 font-medium">Joined</th>
						<th className="px-4 py-3 font-medium">Actions</th>
					</>
				}
			>
				{users.length === 0 ? (
					<tr>
						<td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
							No users found.
						</td>
					</tr>
				) : (
					users.map((user) => {
						const primary = user.name ?? user.email ?? "—";
						const secondaryEmail = user.email && user.email !== primary ? user.email : null;
						return (
							<tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
								<td className="px-4 py-3">
									<div className="flex flex-col">
										<span className="font-medium text-foreground">{primary}</span>
										{secondaryEmail ? <span className="mt-1 text-[12px] text-muted-foreground">{secondaryEmail}</span> : null}
									</div>
								</td>
								<td className="px-4 py-3">{user._count.experienceBookings}</td>
								<td className="px-4 py-3">{user._count.experiences}</td>
								<td className="px-4 py-3">
									<Badge variant="outline" className="text-xs uppercase">
										{user.role.toLowerCase()}
									</Badge>
								</td>
								<td className="px-4 py-3">
									<OrganizerStatusBadge value={user.organizerStatus} />
								</td>
								<td className="px-4 py-3">
									<AccountStatusBadge value={user.accountStatus} />
								</td>
								<td className="px-4 py-3">
									<span className="text-[12px] text-muted-foreground">{formatDistanceToNowStrict(user.createdAt, { addSuffix: true })}</span>
								</td>
								<td className="px-2 py-2">
									<div className="flex items-center gap-1.5">
										<Button asChild variant="outline" size="icon" aria-label="Edit user">
											<Link href={`/admin/users/${user.id}`}>
												<Pencil />
											</Link>
										</Button>
										<UsersActions userId={user.id} experiencesCount={user._count.experiences} bookingsCount={user._count.experienceBookings} />
									</div>
								</td>
							</tr>
						);
					})
				)}
			</AdminTable>
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
