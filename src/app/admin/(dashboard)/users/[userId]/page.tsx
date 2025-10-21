import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminUserForm } from "@/components/admin/admin-user-form";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			headline: true,
			bio: true,
			location: true,
			website: true,
			phone: true,
			image: true,
			preferredLanguage: true,
			preferredCurrency: true,
			preferredTimezone: true,
			role: true,
			activeRole: true,
			organizerStatus: true,
			accountStatus: true,
			lastLoginAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) {
		notFound();
	}

	return (
		<div className="space-y-10">
			<div className="flex flex-col gap-4">
				<Button asChild variant="ghost" className="w-fit gap-2 px-0 text-muted-foreground hover:text-foreground">
					<Link href="/admin/users">
						<ArrowLeft className="h-4 w-4" />
						Back to users
					</Link>
				</Button>
				<div className="flex flex-col gap-3">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">{user.name ?? user.email ?? "Untitled user"}</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Keep explorer and organizer records accurate. Use this panel to update contact details, profile content, and role based permissions.
					</p>
					<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
						<span>User ID: {user.id}</span>
						<span>Joined {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}</span>
						<span>Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.updatedAt)}</span>
						{user.lastLoginAt ? <span>Last login {formatDistanceToNowStrict(user.lastLoginAt, { addSuffix: true })}</span> : null}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="soft" className="text-xs uppercase">
							{user.role.toLowerCase()}
						</Badge>
						<Badge variant="outline" className="text-xs uppercase">
							active: {user.activeRole.toLowerCase()}
						</Badge>
						<Badge variant="outline" className="text-xs uppercase bg-muted/70 text-foreground">
							{user.organizerStatus.toLowerCase()}
						</Badge>
						<Badge variant="outline" className="text-xs uppercase bg-muted/70 text-foreground">
							{String(user.accountStatus).toLowerCase().replace(/_/g, " ")}
						</Badge>
					</div>
				</div>
			</div>

			<AdminUserForm user={user} />
		</div>
	);
}
