"use client";

import { useEffect, useState, useTransition } from "react";

// Removed direct form field imports in favor of InputField reusable component
import { InputField } from "@/components/ui/input-field";

type EmailSettings = {
	id: string;
	provider: string;
	fromName: string;
	fromEmail: string;
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPasswordMasked: boolean;
	secure: boolean;
};

export function EmailConfigForm({ formId }: { formId?: string }) {
	const [isPending, startTransition] = useTransition();
	const [settings, setSettings] = useState<EmailSettings | null>(null);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const [generalError, setGeneralError] = useState<string | null>(null);
	const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
	const [provider, setProvider] = useState("smtp");
	const [fromName, setFromName] = useState("Kamleen");
	const [fromEmail, setFromEmail] = useState("noreply@kamleen.com");
	const [smtpHost, setSmtpHost] = useState("");
	const [smtpPort, setSmtpPort] = useState("587");
	const [smtpUser, setSmtpUser] = useState("");
	const [smtpPassword, setSmtpPassword] = useState("");
	const [secure, setSecure] = useState("false");

	useEffect(() => {
		startTransition(async () => {
			const res = await fetch("/api/admin/settings/email");
			if (res.ok) {
				const data = (await res.json()) as { settings: EmailSettings | null };
				setSettings(data.settings);
				if (data.settings) {
					setProvider(data.settings.provider ?? "smtp");
					setFromName(data.settings.fromName ?? "Kamleen");
					setFromEmail(data.settings.fromEmail ?? "noreply@kamleen.com");
					setSmtpHost(data.settings.smtpHost ?? "");
					setSmtpPort(String(data.settings.smtpPort ?? 587));
					setSmtpUser(data.settings.smtpUser ?? "");
					setSecure(data.settings.secure ? "true" : "false");
					setSmtpPassword("");
				}
			}
		});
	}, []);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData();
		formData.append("provider", provider);
		formData.append("fromName", fromName);
		formData.append("fromEmail", fromEmail);
		formData.append("smtpHost", smtpHost);
		formData.append("smtpPort", smtpPort);
		formData.append("smtpUser", smtpUser);
		if (smtpPassword.trim()) formData.append("smtpPassword", smtpPassword);
		formData.append("secure", secure);
		setErrors({});
		setGeneralError(null);
		setGeneralSuccess(null);
		startTransition(async () => {
			const res = await fetch("/api/admin/settings/email", {
				method: "PUT",
				body: formData,
				// Ensure cookies/session are sent on same-origin
				credentials: "include",
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { errors?: Record<string, string>; message?: string };
				setErrors(data.errors ?? {});
				if (data.message) setGeneralError(data.message);
				if (!data.message && Object.keys(data.errors ?? {}).length === 0) setGeneralError("Failed to save email settings.");
			} else {
				const data = (await res.json()) as { settings: EmailSettings };
				setSettings(data.settings);
				setProvider(data.settings.provider ?? "smtp");
				setFromName(data.settings.fromName ?? "Kamleen");
				setFromEmail(data.settings.fromEmail ?? "noreply@kamleen.com");
				setSmtpHost(data.settings.smtpHost ?? "");
				setSmtpPort(String(data.settings.smtpPort ?? 587));
				setSmtpUser(data.settings.smtpUser ?? "");
				setSecure(data.settings.secure ? "true" : "false");
				setSmtpPassword("");
				setGeneralSuccess("Email settings saved.");
			}
		});
	}

	return (
		<form id={formId} onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
			{generalError ? <p className="md:col-span-2 text-sm text-destructive">{generalError}</p> : null}
			{generalSuccess ? <p className="md:col-span-2 text-sm text-green-600">{generalSuccess}</p> : null}
			<InputField
				name="provider"
				label="Provider"
				placeholder="smtp"
				value={provider}
				onChange={(e) => setProvider(e.target.value)}
				caption="Use SMTP for kamleen.com. Custom providers can be supported later."
				error={errors.provider}
			/>

			<InputField
				name="fromName"
				label="From name"
				placeholder="Kamleen"
				value={fromName}
				onChange={(e) => setFromName(e.target.value)}
				error={errors.fromName}
			/>

			<InputField
				name="fromEmail"
				label="From email"
				placeholder="noreply@kamleen.com"
				value={fromEmail}
				onChange={(e) => setFromEmail(e.target.value)}
				error={errors.fromEmail}
			/>

			<div className="md:col-span-2 grid gap-6 md:grid-cols-2">
				<InputField
					name="smtpHost"
					label="SMTP host"
					placeholder="smtp.kamleen.com"
					value={smtpHost}
					onChange={(e) => setSmtpHost(e.target.value)}
					error={errors.smtpHost}
				/>

				<InputField
					name="smtpPort"
					type="number"
					label="SMTP port"
					placeholder="587"
					value={smtpPort}
					onChange={(e) => setSmtpPort(e.target.value)}
					error={errors.smtpPort}
				/>
			</div>

			<div className="md:col-span-2 grid gap-6 md:grid-cols-2">
				<InputField
					name="smtpUser"
					label="SMTP user"
					placeholder="noreply@kamleen.com"
					value={smtpUser}
					onChange={(e) => setSmtpUser(e.target.value)}
					error={errors.smtpUser}
				/>

				<InputField
					name="smtpPassword"
					type="password"
					label="SMTP password"
					placeholder={settings?.smtpPasswordMasked ? "••••••••" : ""}
					value={smtpPassword}
					onChange={(e) => setSmtpPassword(e.target.value)}
					caption="Leave blank to keep existing password."
					error={errors.smtpPassword}
				/>
			</div>

			<InputField
				name="secure"
				label="Use TLS/SSL"
				placeholder="true|false"
				value={secure}
				onChange={(e) => setSecure(e.target.value)}
				caption="Use true for port 465 (SSL), false for 587 (STARTTLS)."
				error={errors.secure}
			/>
		</form>
	);
}
