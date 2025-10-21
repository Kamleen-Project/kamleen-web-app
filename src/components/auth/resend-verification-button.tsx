"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/providers/notification-provider";

export function ResendVerificationButton({ email }: { email: string }) {
	const { notify } = useNotifications();
	const [pending, setPending] = useState(false);

	async function handleClick() {
		if (!email) return;
		setPending(true);
		try {
			const form = new FormData();
			form.append("email", email);
			const res = await fetch("/api/register/resend-verification", { method: "POST", body: form });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				notify({ title: "Resend failed", message: data.message || "Unable to resend verification email.", intent: "error" });
				return;
			}
			notify({ title: "Email sent", message: "Verification email has been sent.", intent: "success" });
		} catch {
			notify({ title: "Network error", message: "Please try again.", intent: "error" });
		} finally {
			setPending(false);
		}
	}

	return (
		<Button type="button" size="sm" onClick={handleClick} disabled={pending}>
			{pending ? "Sending..." : "Resend verification email"}
		</Button>
	);
}
