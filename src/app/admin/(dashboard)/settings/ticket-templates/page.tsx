import { ConsolePage } from "@/components/console/page";
import { ConsoleSection } from "@/components/console/section";
import { TicketTemplatesManager } from "@/components/admin/settings/ticket-templates-manager";

export default function AdminTicketTemplatesPage() {
	return (
		<ConsolePage title="Ticket templates" subtitle="Customize the PDF ticket layout, branding, and default text that guests receive after booking.">
			<TicketTemplatesManager />
		</ConsolePage>
	);
}
