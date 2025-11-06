import Link from "next/link";
import { redirect } from "next/navigation";

import { ConsoleLayout } from "@/components/console/layout";
import { adminNavItems } from "@/config/console-nav";
import { CtaButton } from "@/components/ui/cta-button";
import { getServerAuthSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerAuthSession();

	if (!session?.user) {
		redirect("/admin/login?error=signin");
	}

	if (session.user.role !== "ADMIN") {
		redirect("/admin/login?error=forbidden");
	}

	return (
		<ConsoleLayout
			title="Control Center"
			subtitle="Kamleen Admin"
			headerHref="/admin"
			navItems={adminNavItems}
			footer={
				<CtaButton asChild color="whiteBorder" size="md" className="w-full justify-start text-sm">
					<Link href="/dashboard">Back to app</Link>
				</CtaButton>
			}
		>
			{children}
		</ConsoleLayout>
	);
}
