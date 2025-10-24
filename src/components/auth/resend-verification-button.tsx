"use client";

import { useState } from "react";

import { CtaButton } from "@/components/ui/cta-button";
import { useNotifications } from "@/components/providers/notification-provider";

type ResendVerificationButtonProps = Omit<React.ComponentProps<typeof CtaButton>, "onClick" | "type" | "disabled" | "children"> & {
	email: string;
};

export function ResendVerificationButton({ email, ...props }: ResendVerificationButtonProps) {
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
		<CtaButton type="button" size="md" onClick={handleClick} disabled={pending} {...props}>
			{pending ? "Sending..." : "Resend verification email"}
		</CtaButton>
	);
}
