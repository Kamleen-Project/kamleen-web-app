import { EmailConfigModal } from "@/components/admin/settings/email-config-modal";
import { EmailTemplatesManager } from "@/components/admin/settings/email-templates-manager";
import { ConsolePage } from "@/components/console/page";
import { ConsoleSection } from "@/components/console/section";

export default function AdminSettingsPage() {
	return (
		<ConsolePage
			title="Administration settings"
			subtitle="Configure platform-wide email delivery using the kamleen.com domain and manage all email templates used across the marketplace."
		>
			<ConsoleSection
				title="Email configuration"
				subtitle="Set SMTP credentials and sender identity for sending emails from kamleen.com."
				action={
					<div className="mt-1">
						<EmailConfigModal />
					</div>
				}
				className="mb-6 gap-0"
			>
				{/* This section is configured via the modal */}
				<></>
			</ConsoleSection>

			<ConsoleSection
				title="Email templates manager"
				subtitle="Create and edit templates for verification, bookings, confirmations, and organizer notifications."
			>
				<EmailTemplatesManager />
			</ConsoleSection>
		</ConsolePage>
	);
}
