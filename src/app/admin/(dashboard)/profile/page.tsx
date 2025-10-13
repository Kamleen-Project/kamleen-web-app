import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConsolePage } from "@/components/console/page";

export default async function AdminProfilePage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/admin/login?error=signin");
	}

	if (session.user.role !== "ADMIN") {
		redirect("/admin/login?error=forbidden");
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
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
		},
	});

	if (!user) {
		redirect("/admin/login?error=signin");
	}

	return (
		<ConsolePage
			title="Manage your admin profile"
			subtitle="Keep your account details current. These details help collaborators recognize you across reviews, approvals, and audit logs."
		>
			<div className="space-y-8">
				<UserProfileForm user={user} />
			</div>
		</ConsolePage>
	);
}
