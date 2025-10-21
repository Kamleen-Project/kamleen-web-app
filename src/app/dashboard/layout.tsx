import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerAuthSession();
	if (!session?.user) {
		redirect("/login");
	}
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { emailVerified: true, birthDate: true, termsAcceptedAt: true, onboardingCompletedAt: true },
	});
	if (!user?.onboardingCompletedAt || !user?.emailVerified || !user.birthDate || !user.termsAcceptedAt) {
		redirect("/onboarding");
	}
	return children;
}
