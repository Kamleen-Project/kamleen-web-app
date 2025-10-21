import { redirect } from "next/navigation";

export default function AdminSettingsIndexRedirect() {
	redirect("/admin/settings/email");
}
