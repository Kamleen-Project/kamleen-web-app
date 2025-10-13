import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";

export default async function AdminUsersPage() {
	const users = await prisma.user.findMany({
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			activeRole: true,
			organizerStatus: true,
			createdAt: true,
		},
	});

	const formatter = new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<ConsolePage
			title="Account directory"
			subtitle="Search, audit, and manage everyone using Kamleen. Promote trusted explorers to organizers, or escalate accounts that require manual review."
		>
			<Card className="border-border/70 bg-card">
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-foreground">All users</h2>
						<p className="text-sm text-muted-foreground">Showing {users.length} records</p>
					</div>
					<Button asChild variant="outline" className="h-9">
						<Link href="/admin/organizers">Review organizer requests</Link>
					</Button>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<table className="min-w-full border-separate border-spacing-y-2 text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
								<th className="px-3 py-2">Name</th>
								<th className="px-3 py-2">Email</th>
								<th className="px-3 py-2">Role</th>
								<th className="px-3 py-2">Active role</th>
								<th className="px-3 py-2">Organizer status</th>
								<th className="px-3 py-2">Joined</th>
								<th className="px-3 py-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr key={user.id} className="rounded-lg border border-border/60 bg-background/80 text-foreground">
									<td className="px-3 py-3 font-medium">{user.name ?? "—"}</td>
									<td className="px-3 py-3 text-muted-foreground">{user.email ?? "—"}</td>
									<td className="px-3 py-3">
										<Badge variant="outline" className="text-xs uppercase">
											{user.role.toLowerCase()}
										</Badge>
									</td>
									<td className="px-3 py-3">
										<Badge variant="soft" className="text-xs uppercase">
											{user.activeRole.toLowerCase()}
										</Badge>
									</td>
									<td className="px-3 py-3 text-muted-foreground">{user.organizerStatus.toLowerCase()}</td>
									<td className="px-3 py-3 text-muted-foreground">{formatter.format(user.createdAt)}</td>
									<td className="px-3 py-3">
										<Button asChild variant="ghost" size="sm" className="px-3">
											<Link href={`/admin/users/${user.id}`}>Manage</Link>
										</Button>
									</td>
								</tr>
							))}
							{users.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
										No users yet. Accounts will appear here as people sign up.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</ConsolePage>
	);
}
