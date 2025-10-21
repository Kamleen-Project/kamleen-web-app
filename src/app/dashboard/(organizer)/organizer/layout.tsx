import Link from "next/link";
import { redirect } from "next/navigation";

import { organizerNavItems } from "@/config/console-nav";
import { ConsoleLayout } from "@/components/console/layout";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.activeRole !== "ORGANIZER") {
		redirect("/dashboard");
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { emailVerified: true, birthDate: true, termsAcceptedAt: true, onboardingCompletedAt: true },
	});
	if (!user?.onboardingCompletedAt || !user.emailVerified || !user.birthDate || !user.termsAcceptedAt) {
		redirect("/onboarding");
	}

	return (
		<ConsoleLayout
			title="Host Workspace"
			subtitle="Organizer Console"
			headerHref="/dashboard/organizer"
			navItems={organizerNavItems}
			footer={
				<Button asChild variant="ghost" className="w-full justify-start text-sm text-muted-foreground">
					<Link href="/experiences">View marketplace</Link>
				</Button>
			}
		>
			{children}
		</ConsoleLayout>
	);
}
