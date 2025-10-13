import Link from "next/link";
import { redirect } from "next/navigation";

import { ConsoleLayout } from "@/components/console/layout";
import { adminNavItems } from "@/config/console-nav";
import { Button } from "@/components/ui/button";
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
				<Button asChild variant="ghost" className="w-full justify-start text-sm text-muted-foreground">
					<Link href="/dashboard">Back to app</Link>
				</Button>
			}
		>
			{children}
		</ConsoleLayout>
	);
}
