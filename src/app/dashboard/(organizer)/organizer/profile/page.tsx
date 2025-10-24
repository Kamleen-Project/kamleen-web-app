import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { ConsolePage } from "@/components/console/page";

export default async function OrganizerProfilePage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
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
			gender: true,
			birthDate: true,
			preferredLanguage: true,
			preferredCurrency: true,
			preferredTimezone: true,
		},
	});

	if (!user) {
		redirect("/login");
	}

	return (
		<ConsolePage title="Profile" subtitle="Share your story with guests">
			<div className="space-y-8">
				<UserProfileForm user={user} />
			</div>
		</ConsolePage>
	);
}
