"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";

type LoginFormProps = {
	redirectTo?: string;
	mode?: "admin" | "user";
};

export function LoginForm({ redirectTo = "/dashboard", mode = "user" }: LoginFormProps) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function quickFill(email: string, password: string) {
		const emailInput = document.getElementById("email") as HTMLInputElement | null;
		const passwordInput = document.getElementById("password") as HTMLInputElement | null;
		if (emailInput) emailInput.value = email;
		if (passwordInput) passwordInput.value = password;
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(form.get("password") ?? "");

		if (!email || !password) {
			setError("Please provide both email and password.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		let callbackUrl: string | undefined;
		if (typeof window !== "undefined") {
			try {
				callbackUrl = new URL(redirectTo, window.location.origin).toString();
			} catch {}
		}

		const result = await signIn("credentials", {
			email,
			password,
			// Scope the login so the provider enforces roles server-side
			loginScope: mode,
			redirect: false,
			callbackUrl,
		});

		// Even if result contains an error (e.g. callback URL validation), the
		// session may still be created successfully. Prefer checking the session.
		const session = await getSession();

		setIsSubmitting(false);

		if (session?.user) {
			router.push(redirectTo);
			router.refresh();
			return;
		}

		if (result?.error) {
			setError("We couldn’t sign you in with those details.");
			return;
		}

		router.push(redirectTo);
		router.refresh();
	}

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<InputField id="email" name="email" type="email" label="Email" placeholder="you@example.com" autoComplete="email" required />
			<InputField id="password" name="password" type="password" label="Password" placeholder="••••••••" autoComplete="current-password" required />
			{error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "Signing in..." : "Sign in"}
			</Button>
			<div className="pt-2">
				<div className="mb-2 text-center text-xs text-muted-foreground">Quick logins</div>
				{mode === "admin" ? (
					<div className="grid grid-cols-1 gap-2">
						<Button type="button" variant="outline" onClick={() => quickFill("admin@together.dev", "admin123")}>
							Admin
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<Button type="button" variant="outline" onClick={() => quickFill("organizer.demo@together.dev", "organizer123")}>
							Organizer
						</Button>
						<Button type="button" variant="outline" onClick={() => quickFill("ella.martinez@together.dev", "explorer123")}>
							Explorer
						</Button>
					</div>
				)}
			</div>
		</form>
	);
}
