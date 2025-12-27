"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

import { CtaButton } from "@/components/ui/cta-button";
import { InputField } from "@/components/ui/input-field";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

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
			} catch { }
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
			{mode !== "admin" && (
				<>
					<GoogleSignInButton redirectTo={redirectTo} />
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
						</div>
					</div>
				</>
			)}
			<InputField id="email" name="email" type="email" label="Email" placeholder="you@example.com" autoComplete="email" required />
			<InputField id="password" name="password" type="password" label="Password" placeholder="••••••••" autoComplete="current-password" required />
			{error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
			<CtaButton type="submit" disabled={isSubmitting} className="w-full" color="black" size="lg">
				{isSubmitting ? "Signing in..." : "Sign in"}
			</CtaButton>
			{/* <div className="pt-2">
				<div className="mb-2 text-center text-xs text-muted-foreground">Quick logins</div>
				{mode === "admin" ? (
					<div className="grid grid-cols-1 gap-2">
						<CtaButton type="button" color="whiteBorder" onClick={() => quickFill("dev@kamleen.com", "admin123")}>
							Admin
						</CtaButton>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<CtaButton type="button" color="whiteBorder" onClick={() => quickFill("organizer@kamleen.com", "organizer123")}>
							Organizer
						</CtaButton>
						<CtaButton type="button" color="whiteBorder" onClick={() => quickFill("explorer@kamleen.com", "explorer123")}>
							Explorer
						</CtaButton>
					</div>
				)}
			</div> */}
		</form>
	);
}
