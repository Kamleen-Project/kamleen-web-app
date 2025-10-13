import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExperienceModal } from "@/components/organizer/add-experience-modal";
import { formatUserPreferences } from "@/lib/user-preferences";
import { ConsolePage } from "@/components/console/page";

export default async function OrganizerOverviewPage() {
	const session = await getServerAuthSession();

	if (!session?.user) {
		return null;
	}

	const experienceCount = await prisma.experience.count({ where: { organizerId: session.user.id } });
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			preferredLanguage: true,
			preferredCurrency: true,
			preferredTimezone: true,
		},
	});

	const preferences = formatUserPreferences(user);

	return (
		<ConsolePage title="Overview">
			<div className="space-y-8">
				<Card className="border-border/60 bg-card/80 shadow-sm">
					<CardHeader>
						<CardTitle>Your experience library</CardTitle>
						<CardDescription>
							You have {experienceCount} {experienceCount === 1 ? "experience" : "experiences"} listed. Keep them polished so explorers know what to expect.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap items-center gap-3">
						<AddExperienceModal />
						<Button asChild variant="outline">
							<Link href="/dashboard/organizer/experiences">Manage experiences</Link>
						</Button>
					</CardContent>
				</Card>

				<Card className="border-border/60 bg-card/70 shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Hosting checklist</CardTitle>
						<CardDescription>
							Double-check your listings each season. Refresh imagery, confirm pricing, and update capacity to reflect current offerings.
						</CardDescription>
					</CardHeader>
				</Card>

				<Card className="border-border/60 bg-card/70 shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Workspace preferences</CardTitle>
						<CardDescription>We use these settings across your calendars, receipts, and notifications.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm">
						<div className="space-y-1">
							<p className="font-medium text-foreground">Language</p>
							<p className="text-muted-foreground">{preferences.languageLabel}</p>
						</div>
						<div className="space-y-1">
							<p className="font-medium text-foreground">Currency</p>
							<p className="text-muted-foreground">{preferences.currencyLabel}</p>
						</div>
						<div className="space-y-1">
							<p className="font-medium text-foreground">Time zone</p>
							<p className="text-muted-foreground">{preferences.timezoneLabel}</p>
						</div>
						<Button asChild variant="ghost" className="mt-2 text-sm">
							<Link href="/dashboard/organizer/settings">Edit preferences</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</ConsolePage>
	);
}
