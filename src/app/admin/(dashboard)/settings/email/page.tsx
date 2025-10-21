import { EmailConfigModal } from "@/components/admin/settings/email-config-modal";
import { EmailTemplatesManager } from "@/components/admin/settings/email-templates-manager";
import { ConsolePage } from "@/components/console/page";
import { ConsoleSection } from "@/components/console/section";

export default function AdminEmailSettingsPage() {
	return (
		<ConsolePage title="Email settings" subtitle="Configure SMTP delivery for kamleen.com and manage all transactional email templates.">
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
				<></>
			</ConsoleSection>
			<EmailTemplatesManager />
		</ConsolePage>
	);
}
