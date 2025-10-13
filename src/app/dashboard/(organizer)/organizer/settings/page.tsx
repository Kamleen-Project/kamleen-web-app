import { redirect } from "next/navigation";

import { OrganizerPreferencesForm } from "@/components/organizer/settings/organizer-preferences-form";
import { getUserSettingsData } from "@/lib/user-preferences";
import { ConsolePage } from "@/components/console/page";

export default async function OrganizerSettingsPage() {
	const data = await getUserSettingsData();

	if (!data) {
		redirect("/login");
	}

	return (
		<ConsolePage title="Settings" subtitle="Workspace defaults for currency, timezone, and language.">
			<OrganizerPreferencesForm user={data} />
		</ConsolePage>
	);
}
