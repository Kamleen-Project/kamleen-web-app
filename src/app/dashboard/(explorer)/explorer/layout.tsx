import Link from "next/link";
import { redirect } from "next/navigation";

import { ConsoleLayout } from "@/components/console/layout";
import { explorerNavItems } from "@/config/console-nav";
import { getServerAuthSession } from "@/lib/auth";
import CtaButton from "@/components/ui/cta-button";

export default async function ExplorerLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/login");
	}

	// Only allow explorers (and block organizer console users)
	if (session.user.role === "ADMIN") {
		redirect("/admin");
	}

	if (session.user.activeRole === "ORGANIZER") {
		redirect("/dashboard/organizer");
	}

	return (
		<ConsoleLayout
			title="Trip Planner"
			subtitle="Explorer Console"
			headerHref="/dashboard/explorer"
			navItems={explorerNavItems}
			footer={
				<CtaButton color="black" size="sm" asChild>
					<Link href="/experiences">Browse experiences</Link>
				</CtaButton>
			}
		>
			{children}
		</ConsoleLayout>
	);
}
