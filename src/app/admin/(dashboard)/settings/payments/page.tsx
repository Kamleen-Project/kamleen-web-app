import { ConsolePage } from "@/components/console/page";
import { ConsoleSection } from "@/components/console/section";
import { PaymentSettingsManager } from "@/components/admin/settings/payment-settings-manager";

export default function AdminPaymentsSettingsPage() {
	return (
		<ConsolePage title="Payments settings" subtitle="Configure payment providers and platform defaults.">
			<PaymentSettingsManager />
		</ConsolePage>
	);
}
