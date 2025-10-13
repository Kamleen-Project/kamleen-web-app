import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConsolePage } from "@/components/console/page";

export default function AdminOrganizersPage() {
	return (
		<ConsolePage
			title="Application queue"
			subtitle="Track organizer onboarding submissions, capture due diligence notes, and decide when an explorer is ready to host their own experiences."
		>
			<Card className="border-border/70 bg-card">
				<CardHeader className="gap-2">
					<h2 className="text-lg font-semibold text-foreground">Workflow coming soon</h2>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					<p>
						We’re building a structured review flow that surfaces organizer applications by urgency, highlights missing information, and records reviewer
						decisions.
					</p>
					<p>In the meantime, you can use the users directory to locate applicants and coordinate with the support team for manual approvals.</p>
				</CardContent>
			</Card>
		</ConsolePage>
	);
}
