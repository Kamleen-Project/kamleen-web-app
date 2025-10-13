"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormSelect } from "@/components/ui/form";
import { ConsoleSection } from "@/components/console/section";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { SelectField } from "@/components/ui/select-field";

import type { UserProfileData } from "./types";

type ProfileDetailsSectionsProps = {
	user: UserProfileData;
	avatarPreview: string;
	avatarFallback: string;
	onAvatarChange: (file: File | null) => void;
	onAvatarRemove: () => void;
	avatarRemoved: boolean;
	emailReadOnly?: boolean;
	emailDescription?: string;
	accountExtras?: ReactNode;
};

export function ProfileDetailsSections({
	user,
	avatarPreview,
	avatarFallback,
	onAvatarChange,
	onAvatarRemove,
	avatarRemoved,
	emailReadOnly = false,
	emailDescription,
	accountExtras,
}: ProfileDetailsSectionsProps) {
	const avatarInputId = useId();

	return (
		<>
			<ConsoleSection>
				<div className="grid gap-6">
					<div className="flex flex-row gap-6">
						<UploadSinglePicture
							id={avatarInputId}
							name="avatar"
							previewUrl={avatarPreview || null}
							onChangeFile={(file) => onAvatarChange(file)}
							onRemove={avatarPreview ? () => onAvatarRemove() : undefined}
							uploadLabel="Upload new photo"
							aspect="square"
						/>
						<div className="space-y-2 grid gap-4 grow items-end">
							<InputField
								label="Full name"
								name="name"
								defaultValue={user.name ?? ""}
								placeholder="Your name"
								autoComplete="name"
								caption="Description used across the platform."
							/>
						</div>
					</div>

					<InputField
						label="Headline"
						name="headline"
						defaultValue={user.headline ?? ""}
						placeholder="Ceramic artist & tea storyteller"
						caption="A short introduction visible on your profile card."
					/>

					<TextareaField
						label="Bio"
						name="bio"
						defaultValue={user.bio ?? ""}
						placeholder="Share your story, experience highlights, or what guests can expect."
						caption="Use a few sentences to tell your story."
					/>

					<div className="grid gap-6 sm:grid-cols-2">
						<InputField label="Location" name="location" defaultValue={user.location ?? ""} placeholder="City, Country" caption="Where guests can meet you." />
						<InputField
							label="Website"
							name="website"
							defaultValue={user.website ?? ""}
							placeholder="https://"
							type="url"
							caption="Add a personal site or portfolio link."
						/>
					</div>

					<InputField
						label="Phone"
						name="phone"
						defaultValue={user.phone ?? ""}
						placeholder="+1 415 555 0101"
						type="tel"
						caption="Optional contact number for coordination."
					/>
				</div>
			</ConsoleSection>

			{/* Preferences as reusable console section */}
			<ConsoleSection title="Preferences" subtitle="Tailor your experience and communications to fit your workflow and locale.">
				<div className="grid gap-6 sm:grid-cols-3">
					<SelectField
						label="Language"
						name="preferredLanguage"
						defaultValue={user.preferredLanguage}
						options={[
							{ value: "en", label: "English" },
							{ value: "fr", label: "French" },
							{ value: "es", label: "Spanish" },
							{ value: "de", label: "German" },
							{ value: "it", label: "Italian" },
							{ value: "pt", label: "Portuguese" },
						]}
						caption="Choose the language for emails and in-product copy."
					/>

					<SelectField
						label="Currency"
						name="preferredCurrency"
						defaultValue={user.preferredCurrency}
						options={[
							{ value: "USD", label: "US Dollar" },
							{ value: "EUR", label: "Euro" },
							{ value: "GBP", label: "British Pound" },
							{ value: "CAD", label: "Canadian Dollar" },
							{ value: "AUD", label: "Australian Dollar" },
						]}
						caption="Display listing prices and balances in your preferred currency."
					/>

					<SelectField
						label="Time zone"
						name="preferredTimezone"
						defaultValue={user.preferredTimezone}
						options={[
							{ value: "UTC", label: "Coordinated Universal Time" },
							{ value: "America/New_York", label: "New York (UTC-05:00)" },
							{ value: "America/Los_Angeles", label: "Los Angeles (UTC-08:00)" },
							{ value: "Europe/London", label: "London (UTC+00:00)" },
							{ value: "Europe/Paris", label: "Paris (UTC+01:00)" },
							{ value: "Asia/Dubai", label: "Dubai (UTC+04:00)" },
							{ value: "Asia/Tokyo", label: "Tokyo (UTC+09:00)" },
						]}
						caption="We’ll align your calendar, reminders, and sessions to this time zone."
					/>
				</div>
			</ConsoleSection>

			{/* Explorer notification preferences */}
			<ConsoleSection title="Notifications" subtitle="Choose how you’d like to be notified about your reservations.">
				<div className="space-y-3 rounded-xl border border-border/60 p-4">
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="toastEnabled" value="false" />
							<input type="checkbox" name="toastEnabled" defaultChecked={user.notificationPreference?.toastEnabled ?? true} value="true" />
							<span>In-app toasts</span>
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="emailEnabled" value="false" />
							<input type="checkbox" name="emailEnabled" defaultChecked={user.notificationPreference?.emailEnabled ?? true} value="true" />
							<span>Email</span>
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="pushEnabled" value="false" />
							<input type="checkbox" name="pushEnabled" defaultChecked={user.notificationPreference?.pushEnabled ?? false} value="true" />
							<span>Push</span>
						</label>
					</div>
					<div className="pt-2 text-xs text-muted-foreground">Events</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="onBookingCreated" value="false" />
							<input type="checkbox" name="onBookingCreated" defaultChecked={user.notificationPreference?.onBookingCreated ?? true} value="true" />
							<span>On reservation requested</span>
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="onBookingConfirmed" value="false" />
							<input type="checkbox" name="onBookingConfirmed" defaultChecked={user.notificationPreference?.onBookingConfirmed ?? true} value="true" />
							<span>On reservation confirmed</span>
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="hidden" name="onBookingCancelled" value="false" />
							<input type="checkbox" name="onBookingCancelled" defaultChecked={user.notificationPreference?.onBookingCancelled ?? true} value="true" />
							<span>On reservation cancelled</span>
						</label>
					</div>
				</div>
			</ConsoleSection>

			<ConsoleSection title="Account">
				<div className="grid gap-3">
					<FormField>
						<FormLabel>Email</FormLabel>
						<FormControl>
							<FormInput
								name="email"
								defaultValue={user.email ?? ""}
								readOnly={emailReadOnly}
								className={emailReadOnly ? "bg-muted/50" : undefined}
								type="email"
							/>
						</FormControl>
						{emailDescription ? <FormDescription>{emailDescription}</FormDescription> : null}
					</FormField>
					{accountExtras}
				</div>
			</ConsoleSection>
		</>
	);
}
