"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { InputField } from "@/components/ui/input-field";
// Note: Avoid using FormLabel outside of a FormField context
import { useNotifications } from "@/components/providers/notification-provider";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { BirthdateField } from "@/components/ui/birthdate-field";
import { format } from "date-fns";
import { RadioGroupField } from "@/components/ui/radio-group-field";

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
	const [avatarPreview, setAvatarPreview] = useState<string>("");
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarRemoved, setAvatarRemoved] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	// Date picker state
	const initialDate = useMemo(() => {
		if (!defaultBirthDate) return undefined;
		try {
			const d = new Date(defaultBirthDate);
			return isNaN(d.getTime()) ? undefined : d;
		} catch {
			return undefined;
		}
	}, [defaultBirthDate]);
	const [birthDate, setBirthDate] = useState<Date | undefined>(initialDate);
	const [gender, setGender] = useState<string>("");

	useEffect(() => {
		return () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [objectUrl]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (disabled) return;
		// Client-side required checks for onboarding step
		if (!gender) {
			notify({ title: "Missing gender", message: "Please select your gender.", intent: "error" });
			return;
		}
		if (!birthDate) {
			notify({ title: "Missing birth date", message: "Please provide your birth date.", intent: "error" });
			return;
		}
		const form = new FormData(event.currentTarget);
		// Ensure birthDate hidden reflects picker selection
		if (birthDate) {
			form.set("birthDate", format(birthDate, "yyyy-MM-dd"));
		}
		// Ensure avatar file is included even if the input clears itself
		if (avatarFile) {
			form.set("avatar", avatarFile);
		} else {
			form.delete("avatar");
		}
		form.set("removeAvatar", avatarRemoved ? "true" : "false");
		setPending(true);
		try {
			const res = await fetch("/api/profile", { method: "PATCH", body: form });
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
		<form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 mt-6" encType="multipart/form-data">
			<fieldset disabled={disabled || pending} className="contents">
				{/* Optional profile picture */}
				<div className="max-w-xs">
					<UploadSinglePicture
						name="avatar"
						previewUrl={avatarPreview || null}
						onChangeFile={(file) => {
							if (objectUrl) {
								URL.revokeObjectURL(objectUrl);
							}
							if (file) {
								const url = URL.createObjectURL(file);
								setAvatarPreview(url);
								setObjectUrl(url);
								setAvatarFile(file);
								setAvatarRemoved(false);
							} else {
								setAvatarPreview("");
								setAvatarFile(null);
							}
						}}
						onRemove={() => {
							if (objectUrl) {
								URL.revokeObjectURL(objectUrl);
							}
							setObjectUrl(null);
							setAvatarPreview("");
							setAvatarFile(null);
							setAvatarRemoved(true);
						}}
						uploadLabel="Upload profile photo (optional)"
						aspect="square"
					/>
				</div>

				<InputField label={<>Full name</>} name="name" type="text" defaultValue={defaultName ?? ""} required />

				<RadioGroupField
					label={<>Gender</>}
					name="gender"
					value={gender}
					onChange={setGender}
					required
					options={[
						{ label: <>Male</>, value: "MALE" },
						{ label: <>Female</>, value: "FEMALE" },
						{ label: <>Rather not say</>, value: "RATHER_NOT_SAY" },
					]}
				/>

				<BirthdateField label={<>Birth date</>} name="birthDate" value={birthDate} onChange={(d) => setBirthDate(d)} required />

				{/* Accept terms - modern checkbox */}
				<input type="hidden" name="acceptTerms" value="false" />
				<CheckboxField
					name="acceptTerms"
					value="true"
					defaultChecked={!!defaultTermsAccepted}
					required
					label={<>I agree to the Terms of Service and Privacy Policy</>}
				/>
			</fieldset>
		</form>
	);
}
