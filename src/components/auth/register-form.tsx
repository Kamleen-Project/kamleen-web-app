"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { CtaButton } from "@/components/ui/cta-button";
import { InputField } from "@/components/ui/input-field";
import { sanitizeRelativePath } from "@/lib/sanitize-relative-path";

type RegisterFormProps = {
	onboardingNext?: string;
};

export function RegisterForm({ onboardingNext }: RegisterFormProps = {}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = String(form.get("name") ?? "").trim();
		const email = String(form.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(form.get("password") ?? "");

		if (!name || !email || !password) {
			setError("All fields are required.");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		const response = await fetch("/api/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name, email, password }),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({ message: "Something went wrong." }));
			setError(data.message ?? "Something went wrong.");
			setIsSubmitting(false);
			return;
		}

		const signInResult = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setIsSubmitting(false);

		if (signInResult?.error) {
			router.push("/login");
			return;
		}

		const params = new URLSearchParams({ start: "welcome" });
		const safeNext = sanitizeRelativePath(onboardingNext);
		if (safeNext) {
			params.set("next", safeNext);
		}

		router.push(`/onboarding?${params.toString()}`);
		router.refresh();
	}

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<InputField id="name" name="name" type="text" label="Full name" placeholder="Your name" autoComplete="name" required />
			<InputField id="email" name="email" type="email" label="Email" placeholder="you@example.com" autoComplete="email" required />
			<InputField
				id="password"
				name="password"
				type="password"
				label="Password"
				placeholder="At least 8 characters"
				minLength={8}
				autoComplete="new-password"
				required
			/>
			{error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
			<CtaButton type="submit" disabled={isSubmitting} className="w-full" color="black" size="lg">
				{isSubmitting ? "Creating account..." : "Create account"}
			</CtaButton>
		</form>
	);
}
