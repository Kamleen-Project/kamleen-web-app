"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { FormControl, FormDescription, FormField, FormLabel, FormSelect } from "@/components/ui/form";
import type { UserPreferencesData } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

const LANGUAGE_OPTIONS = [
	{ value: "en", label: "English" },
	{ value: "fr", label: "French" },
	{ value: "es", label: "Spanish" },
	{ value: "de", label: "German" },
	{ value: "it", label: "Italian" },
	{ value: "pt", label: "Portuguese" },
];

const CURRENCY_OPTIONS = [
	{ value: "USD", label: "US Dollar" },
	{ value: "EUR", label: "Euro" },
	{ value: "GBP", label: "British Pound" },
	{ value: "CAD", label: "Canadian Dollar" },
	{ value: "AUD", label: "Australian Dollar" },
	{ value: "AED", label: "UAE Dirham" },
];

const TIMEZONE_OPTIONS = [
	{ value: "UTC", label: "Coordinated Universal Time" },
	{ value: "America/New_York", label: "New York (UTC-05:00)" },
	{ value: "America/Los_Angeles", label: "Los Angeles (UTC-08:00)" },
	{ value: "Europe/London", label: "London (UTC+00:00)" },
	{ value: "Europe/Paris", label: "Paris (UTC+01:00)" },
	{ value: "Asia/Dubai", label: "Dubai (UTC+04:00)" },
	{ value: "Asia/Tokyo", label: "Tokyo (UTC+09:00)" },
];

export function OrganizerPreferencesForm({ user }: { user: UserPreferencesData }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		const preferenceFields = ["preferredLanguage", "preferredCurrency", "preferredTimezone"] as const;

		for (const field of preferenceFields) {
			const value = formData.get(field);
			if (typeof value === "string") {
				formData.set(field, value.trim());
			}
		}

		startTransition(async () => {
			setMessage(null);
			setError(null);

			const payload: Record<string, string | boolean> = {};
			preferenceFields.forEach((field) => {
				const value = formData.get(field);
				if (typeof value === "string" && value.length > 0) {
					payload[field] = value;
				}
			});

			// Notification preferences
			const booleanKeys = [
				"toastEnabled",
				"pushEnabled",
				"emailEnabled",
				"onBookingCreated",
				"onBookingConfirmed",
				"onBookingCancelled",
				"onExperiencePublished",
				"onExperienceUnpublished",
				"onVerificationApproved",
				"onVerificationRejected",
			] as const;
			for (const key of booleanKeys) {
				const raw = formData.get(key);
				if (raw !== null) {
					const v = String(raw).toLowerCase();
					payload[key] = v === "true" || v === "1" || v === "on";
				}
			}

			const response = await fetch("/api/profile", {
				method: "PATCH",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: "Unable to update preferences" }));
				setError(data.message ?? "Unable to update preferences");
				return;
			}

			setMessage("Preferences saved");
			router.refresh();
		});
	}

	return (
		<div className="space-y-6">
			<form onSubmit={handleSubmit} className="space-y-6">
				<Card className="border-border/60 bg-card/90 shadow-none">
					<CardHeader className="space-y-2">
						<CardTitle className="text-xl">Localization preferences</CardTitle>
						<p className="text-sm text-muted-foreground">
							Align language, currency, and time zone so explorers see accurate information across receipts and itineraries.
						</p>
					</CardHeader>
					<CardContent className="grid gap-6 sm:grid-cols-3">
						<FormField>
							<FormLabel>Language</FormLabel>
							<FormControl>
								<FormSelect name="preferredLanguage" defaultValue={user.preferredLanguage} disabled={pending}>
									{LANGUAGE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Select the language used for emails and in-product copy.</FormDescription>
						</FormField>

						<FormField>
							<FormLabel>Currency</FormLabel>
							<FormControl>
								<FormSelect name="preferredCurrency" defaultValue={user.preferredCurrency} disabled={pending}>
									{CURRENCY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>Pricing defaults to this currency across your listings.</FormDescription>
						</FormField>

						<FormField>
							<FormLabel>Time zone</FormLabel>
							<FormControl>
								<FormSelect name="preferredTimezone" defaultValue={user.preferredTimezone} disabled={pending}>
									{TIMEZONE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</FormSelect>
							</FormControl>
							<FormDescription>We align your calendar sessions and messages to this time zone.</FormDescription>
						</FormField>
					</CardContent>
					<CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-xs text-muted-foreground">Updates apply immediately across your organizer workspace.</div>
						<CtaButton color="black" size="md" type="submit" disabled={pending} className={cn(pending && "opacity-80")}>
							Save preferences
						</CtaButton>
					</CardFooter>
				</Card>

				<Card className="border-border/60 bg-card/90 shadow-none">
					<CardHeader className="space-y-2">
						<CardTitle className="text-xl">Notification preferences</CardTitle>
						<p className="text-sm text-muted-foreground">Choose channels and events you want to be notified about.</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="toastEnabled" defaultChecked />
								<span>In-app toasts</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="emailEnabled" defaultChecked />
								<span>Email</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="pushEnabled" />
								<span>Push</span>
							</label>
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onBookingCreated" defaultChecked />
								<span>On booking created</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onBookingConfirmed" defaultChecked />
								<span>On booking confirmed</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onBookingCancelled" defaultChecked />
								<span>On booking cancelled</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onExperiencePublished" defaultChecked />
								<span>On experience published</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onExperienceUnpublished" />
								<span>On experience unpublished</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onVerificationApproved" defaultChecked />
								<span>On verification approved</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" name="onVerificationRejected" defaultChecked />
								<span>On verification rejected</span>
							</label>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-xs text-muted-foreground">Channel and event choices apply to your account.</div>
						<CtaButton color="black" size="md" type="submit" disabled={pending} className={cn(pending && "opacity-80")}>
							Save preferences
						</CtaButton>
					</CardFooter>
				</Card>

				{message ? <p className="text-sm text-emerald-600">{message}</p> : null}
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
			</form>
		</div>
	);
}
