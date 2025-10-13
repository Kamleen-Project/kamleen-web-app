import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";

const sections = [
	{
		name: "Experience categories",
		description: "Define the taxonomy explorers browse. Manage names, imagery, and ordering.",
		href: "/admin/data-manager/categories",
	},
	{
		name: "Locations",
		description: "Maintain the country → state → city hierarchy used across organizer workflows.",
		href: "/admin/data-manager/locations",
	},
];

export default function DataManagerPage() {
	return (
		<ConsolePage
			title="Source-of-truth library"
			subtitle="Keep categories and location data aligned with the marketplace. Changes here power organizer flows, explorer search, and seeding scripts."
		>
			<div className="grid gap-6 lg:grid-cols-2">
				{sections.map((section) => (
					<Card key={section.href} className="border-border/70 bg-card/80 shadow-sm">
						<CardHeader className="gap-3">
							<div>
								<h2 className="text-xl font-semibold text-foreground">{section.name}</h2>
								<p className="text-sm text-muted-foreground">{section.description}</p>
							</div>
						</CardHeader>
						<CardContent className="flex justify-end">
							<Button asChild>
								<Link href={section.href}>Open manager</Link>
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
		</ConsolePage>
	);
}
