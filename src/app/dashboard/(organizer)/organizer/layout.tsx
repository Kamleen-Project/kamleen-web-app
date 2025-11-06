import Link from "next/link";
import { redirect } from "next/navigation";

import { organizerNavItems } from "@/config/console-nav";
import { ConsoleLayout } from "@/components/console/layout";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CtaButton from "@/components/ui/cta-button";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { emailVerified: true, birthDate: true, termsAcceptedAt: true, onboardingCompletedAt: true, organizerStatus: true, activeRole: true },
	});

	// Enforce organizer-only access for organizer console
	if (!user || user.organizerStatus !== "APPROVED") {
		redirect("/dashboard");
	}
	if (user.activeRole !== "ORGANIZER") {
		redirect("/dashboard/explorer");
	}
	if (!user.onboardingCompletedAt || !user.emailVerified || !user.birthDate || !user.termsAcceptedAt) {
		redirect("/onboarding");
	}

	return (
		<ConsoleLayout
			title="Host Workspace"
			subtitle="Organizer Console"
			headerHref="/dashboard/organizer"
			navItems={organizerNavItems}
			footer={
				<CtaButton color="black" size="sm" asChild>
					<Link href="/experiences">View marketplace</Link>
				</CtaButton>
			}
		>
			{children}
		</ConsoleLayout>
	);
}
