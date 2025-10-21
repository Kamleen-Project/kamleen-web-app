"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { InputField } from "@/components/ui/input-field";
import { FormControl, FormField, FormLabel } from "@/components/ui/form";
import { useNotifications } from "@/components/providers/notification-provider";

type Props = {
	formId: string;
	defaultName?: string | null;
	defaultBirthDate?: string | null;
	defaultTermsAccepted?: boolean;
	disabled?: boolean;
};

export function OnboardingProfileForm({ formId, defaultName, defaultBirthDate, defaultTermsAccepted, disabled = false }: Props) {
	const router = useRouter();
	const { notify } = useNotifications();
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (disabled) return;
		const form = new FormData(event.currentTarget);
		setPending(true);
		try {
			const res = await fetch("/api/profile", {
				method: "PATCH",
				body: JSON.stringify(Object.fromEntries(form as unknown as Iterable<[string, FormDataEntryValue]>)),
				headers: { "content-type": "application/json" },
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ message: "Unable to save profile" }));
				notify({ title: "Update failed", message: data.message || "Unable to save profile.", intent: "error" });
				return;
			}
			notify({ title: "Saved", message: "Your profile information was saved.", intent: "success" });
			// stay on onboarding; parent will render step 3 on refresh
			router.refresh();
		} catch {
			notify({ title: "Network error", message: "Please try again.", intent: "error" });
		} finally {
			setPending(false);
		}
	}

	return (
		<form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 gap-4" encType="application/x-www-form-urlencoded">
			<fieldset disabled={disabled || pending} className="contents">
				<InputField label={<>Full name</>} name="name" type="text" defaultValue={defaultName ?? ""} required />
				<InputField label={<>Birth date</>} name="birthDate" type="date" defaultValue={defaultBirthDate ?? ""} required />
				<FormField>
					<FormControl className="flex items-center gap-2">
						<>
							<input type="hidden" name="acceptTerms" value="false" />
							<input id="acceptTerms" type="checkbox" name="acceptTerms" value="true" defaultChecked={!!defaultTermsAccepted} required />
							<FormLabel htmlFor="acceptTerms" className="!mb-0">
								I agree to the Terms of Service and Privacy Policy
							</FormLabel>
						</>
					</FormControl>
				</FormField>
			</fieldset>
		</form>
	);
}
