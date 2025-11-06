"use client";

import { useState, useTransition } from "react";

import { CtaButton } from "@/components/ui/cta-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { CheckboxField } from "@/components/ui/checkbox-field";

export function OrganizerIntroForm({ onSuccess }: { onSuccess?: () => void }) {
	const [aboutSelf, setAboutSelf] = useState("");
	const [aboutExperience, setAboutExperience] = useState("");
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		startTransition(async () => {
			setError(null);
			setMessage(null);
			try {
				const response = await fetch("/api/organizer/apply", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ organizerAboutSelf: aboutSelf, organizerAboutExperience: aboutExperience, organizerTermsAccepted: accepted }),
				});
				if (!response.ok) {
					const data = (await response.json().catch(() => null)) as { message?: string } | null;
					setError(data?.message ?? "Unable to submit application");
					return;
				}
				setMessage("Application submitted. We'll notify you after review.");
				onSuccess?.();
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Unable to submit");
			}
		});
	}

	const aboutSelfMin = 30;
	const aboutExperienceMin = 30;
	const canSubmit = !pending && accepted && aboutSelf.trim().length >= aboutSelfMin && aboutExperience.trim().length >= aboutExperienceMin;

	return (
		<form onSubmit={handleSubmit} className="flex h-full flex-col gap-6 p-6 md:p-8">
			<div>
				<h2 className="text-xl font-semibold text-foreground">Apply to become an organizer</h2>
				<p className="mt-1 text-sm text-muted-foreground">Tell us about yourself and the kind of experiences you want to host.</p>
			</div>

			<TextareaField
				label="About you"
				id="aboutSelf"
				value={aboutSelf}
				onChange={(e) => setAboutSelf(e.target.value)}
				rows={4}
				placeholder="Share your background, expertise, and why you want to host."
				caption={
					<span>
						Minimum {aboutSelfMin} characters. {aboutSelf.trim().length < aboutSelfMin ? `(${aboutSelfMin - aboutSelf.trim().length} to go)` : null}
					</span>
				}
			/>

			<TextareaField
				label="About your experiences"
				id="aboutExperience"
				value={aboutExperience}
				onChange={(e) => setAboutExperience(e.target.value)}
				rows={4}
				placeholder="Describe the types of experiences you plan to offer."
				caption={
					<span>
						Minimum {aboutExperienceMin} characters.{" "}
						{aboutExperience.trim().length < aboutExperienceMin ? `(${aboutExperienceMin - aboutExperience.trim().length} to go)` : null}
					</span>
				}
			/>

			<CheckboxField
				checked={accepted}
				onChange={(e) => setAccepted(e.currentTarget.checked)}
				label={
					<span>
						I agree to the{" "}
						<a href="/terms" className="underline">
							organizer terms
						</a>
						.
					</span>
				}
			/>

			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{!error && message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

			<div className="mt-auto flex justify-end gap-3 pt-2">
				<CtaButton type="submit" color="black" isLoading={pending} disabled={!canSubmit}>
					Submit application
				</CtaButton>
			</div>
		</form>
	);
}
