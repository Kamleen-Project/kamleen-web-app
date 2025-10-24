import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { ConsolePage } from "@/components/console/page";

export default async function ExplorerProfilePage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const rawUser = await prisma.user.findUnique({
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
			notificationPreference: {
				select: {
					toastEnabled: true,
					pushEnabled: true,
					emailEnabled: true,
					onBookingCreated: true,
					onBookingConfirmed: true,
					onBookingCancelled: true,
				},
			},
		},
	});

	const user = rawUser ? { ...rawUser, notificationPreference: rawUser.notificationPreference ?? undefined } : null;

	if (!user) {
		redirect("/login");
	}

	return (
		<ConsolePage title="Keep your traveler profile current" subtitle="These details help hosts tailor experiences and keep your group in sync.">
			<div className="space-y-8">
				<UserProfileForm user={user} />
			</div>
		</ConsolePage>
	);
}
