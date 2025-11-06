"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormInput, FormLabel, FormMessage } from "@/components/ui/form";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { SelectField } from "@/components/ui/select-field";
import { Plus } from "lucide-react";
import { CodeEditor } from "@/components/ui/code-editor";
import CtaIconButton from "@/components/ui/cta-icon-button";
import CtaButton from "@/components/ui/cta-button";

type EmailTemplate = {
	id: string;
	key: string;
	name: string;
	subject: string;
	html: string;
	text?: string | null;
	logoUrl?: string | null;
	category?: "ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL";
	updatedAt: string;
};

const defaultTemplateKeys: { key: string; name: string; description: string }[] = [
	{ key: "welcome_verify", name: "Welcome + Verify Email", description: "Sent after signup with verify CTA" },
	{ key: "email_verification", name: "Email verification", description: "Sent to new users to verify their email" },
	{ key: "booking_request", name: "Booking request", description: "Sent to organizers when a booking is requested" },
	{ key: "booking_confirmation", name: "Booking confirmation", description: "Sent to explorers when a booking is confirmed" },
	{ key: "booking_notification_organizer", name: "Organizer booking notification", description: "Organizer summary and actions" },
	{ key: "booking_request_explorer", name: "Reservation request (explorer)", description: "Sent to explorers when they submit a reservation request" },
	{ key: "booking_cancelled_explorer", name: "Reservation cancelled (explorer)", description: "Sent to explorers when a reservation is cancelled" },
];

export function EmailTemplatesManager() {
	const [isPending, startTransition] = useTransition();
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [activeKey, setActiveKey] = useState<string>(defaultTemplateKeys[0]?.key ?? "");
	const active = useMemo(() => templates.find((t) => t.key === activeKey), [templates, activeKey]);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const [testOpen, setTestOpen] = useState(false);
	const [testEmail, setTestEmail] = useState("");
	const [testStatus, setTestStatus] = useState<string | null>(null);
	const [sidebarCategory, setSidebarCategory] = useState<"ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL">("ALL");
	const [createOpen, setCreateOpen] = useState(false);
	const [createKey, setCreateKey] = useState("");
	const [createName, setCreateName] = useState("");
	const [createCategory, setCreateCategory] = useState<"ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL">("ALL");
	const [createError, setCreateError] = useState<string | null>(null);

	// HTML editor state and view toggle
	const [htmlEditorMode, setHtmlEditorMode] = useState<"code" | "preview">("preview");
	const [htmlValue, setHtmlValue] = useState<string>("");

	useEffect(() => {
		startTransition(async () => {
			const res = await fetch("/api/admin/settings/templates");
			if (res.ok) {
				const data = (await res.json()) as { templates: EmailTemplate[] };
				setTemplates(data.templates);
			}
		});
	}, []);

	// Keep local html state in sync when switching templates or after save fetch
	useEffect(() => {
		setHtmlValue(active?.html ?? "");
		setHtmlEditorMode("preview");
	}, [activeKey, active?.html]);

	// Simple client-side interpolation to approximate server rendering during preview
	function interpolate(input: string, variables: Record<string, string | number>) {
		return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in variables ? String(variables[k]) : `{{ ${k} }}`));
	}

	function ensureSansSerif(value: string) {
		try {
			const bodyTagRegex = /<body(\s+[^>]*?)?>/i;
			if (bodyTagRegex.test(value)) {
				return value.replace(bodyTagRegex, (match) => {
					const hasStyle = /style=\"[^\"]*\"/i.test(match);
					if (!hasStyle) {
						return match.replace(
							/>$/,
							' style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;">'
						);
					}
					return match.replace(/style=\"([^\"]*)\"/i, (m, styleValue) => {
						if (/font-family\s*:/i.test(styleValue)) return m;
						const sep = styleValue.trim().length > 0 && !/;\s*$/.test(styleValue) ? "; " : "";
						return `style="${styleValue}${sep}font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;"`;
					});
				});
			}
			return `<body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;">${value}</body>`;
		} catch {
			return value;
		}
	}

	function enhanceForPreview(value: string, opts: { logoUrl?: string }) {
		try {
			const logoUrl = opts.logoUrl ?? "";
			const escapedLogoForCss = logoUrl.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
			const enhancementCss = [
				"a.btn{display:inline-block!important;margin:12px auto!important;background:linear-gradient(30deg,#ff512f,#dd2476)!important;color:#ffffff!important;text-decoration:none!important;font-weight:600!important;border-radius:9999px!important;padding:12px 18px!important;}",
				escapedLogoForCss
					? `img[src=\"${escapedLogoForCss}\"]{display:block!important;margin:0 auto!important;height:48px!important;width:auto!important;border:none!important;outline:none!important;}`
					: "",
			]
				.filter(Boolean)
				.join("");

			const styleTag = `<style id=\"admin-preview-enhancements\">${enhancementCss}</style>`;
			if (/<head(\s+[^>]*?)?>/i.test(value)) {
				return value.replace(/<head(\s+[^>]*?)?>/i, (m) => m + styleTag);
			}
			if (/<body(\s+[^>]*?)?>/i.test(value)) {
				return value.replace(/<body(\s+[^>]*?)?>/i, (m) => m + styleTag);
			}
			// Fallback: prepend styles if no head/body detected
			return styleTag + value;
		} catch {
			return value;
		}
	}

	const previewHtml = useMemo(() => {
		const variables = {
			logoUrl: active?.logoUrl || "/globe.svg",
		};
		const interpolated = interpolate(htmlValue, variables);
		const withFont = ensureSansSerif(interpolated);
		return enhanceForPreview(withFont, { logoUrl: String(variables.logoUrl) });
	}, [htmlValue, active?.logoUrl]);

	const categoryOptions = useMemo(
		() => [
			{ label: "All", value: "ALL" },
			{ label: "Admin", value: "ADMIN" },
			{ label: "Explorer", value: "EXPLORER" },
			{ label: "Organizer", value: "ORGANIZER" },
		],
		[]
	);

	const categoryByKey = useMemo(() => {
		const map: Record<string, "ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL"> = {};
		for (const t of templates) {
			map[t.key] = t.category ?? "ALL";
		}
		return map;
	}, [templates]);

	const customTemplateKeys = useMemo(() => {
		const defs = new Set(defaultTemplateKeys.map((d) => d.key));
		return templates.filter((t) => !defs.has(t.key)).map((t) => ({ key: t.key, name: t.name || t.key, description: "Custom template" }));
	}, [templates]);

	const visibleTemplateKeys = useMemo(() => {
		const filterByCategory = (key: string) => sidebarCategory === "ALL" || (categoryByKey[key] ?? "ALL") === sidebarCategory;
		const defaults = defaultTemplateKeys.filter((d) => filterByCategory(d.key));
		const customs = customTemplateKeys.filter((d) => filterByCategory(d.key)).sort((a, b) => a.key.localeCompare(b.key));
		return [...defaults, ...customs];
	}, [sidebarCategory, categoryByKey, customTemplateKeys]);

	function onCreateTemplate() {
		setCreateError(null);
		const key = createKey.trim();
		const name = createName.trim();
		if (!key || !name) {
			setCreateError("Key and Name are required.");
			return;
		}
		if (!/^[a-z0-9_]+$/.test(key)) {
			setCreateError("Key must be lowercase letters, numbers, and underscores only.");
			return;
		}
		const exists = defaultTemplateKeys.some((d) => d.key === key) || templates.some((t) => t.key === key);
		if (exists) {
			setCreateError("A template with this key already exists.");
			return;
		}
		const now = new Date().toISOString();
		const newTemplate: EmailTemplate = {
			id: `temp_${Date.now()}`,
			key,
			name,
			subject: "",
			html: "",
			text: "",
			logoUrl: "",
			category: createCategory,
			updatedAt: now,
		};
		setTemplates((prev) => [...prev, newTemplate]);
		setActiveKey(key);
		setCreateOpen(false);
		setCreateKey("");
		setCreateName("");
		setCreateCategory("ALL");
	}

	function onSave(formData: FormData) {
		setErrors({});
		startTransition(async () => {
			const res = await fetch(`/api/admin/settings/templates/${activeKey}`, {
				method: "PUT",
				body: formData,
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { errors?: Record<string, string> };
				setErrors(data.errors ?? {});
			} else {
				const data = (await res.json()) as { template: EmailTemplate };
				setTemplates((prev) => {
					const idx = prev.findIndex((t) => t.key === data.template.key);
					if (idx === -1) return [...prev, data.template];
					const copy = [...prev];
					copy[idx] = data.template;
					return copy;
				});
			}
		});
	}

	function onSendTest() {
		setTestStatus(null);
		const email = testEmail.trim();
		if (!email) {
			setTestStatus("Please enter a recipient email.");
			return;
		}
		startTransition(async () => {
			try {
				const res = await fetch(`/api/admin/settings/templates/${activeKey}/send-test`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ to: email }),
				});
				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as { message?: string };
					setTestStatus(data.message ?? "Failed to send test email.");
					return;
				}
				setTestStatus("Sent! Check the inbox.");
			} catch (err) {
				setTestStatus("Network error. Please try again.");
			}
		});
	}

	return (
		<div className="grid gap-6 lg:grid-cols-6">
			<div className="lg:col-span-2 space-y-2">
				<Card className="border-border/60 bg-background/80">
					<CardHeader className="gap-2">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Templates</h3>
							<CtaIconButton color="whiteBorder" size="md" ariaLabel="Add template" onClick={() => setCreateOpen(true)}>
								<Plus className="h-4 w-4" />
							</CtaIconButton>
						</div>
						<SelectField
							name="sidebar_category_filter"
							label={<span className="text-xs text-muted-foreground">Filter by category</span>}
							value={sidebarCategory}
							onChange={(e) => setSidebarCategory(e.target.value as "ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL")}
							options={categoryOptions}
							containerClassName="mb-1"
						/>
					</CardHeader>
					<CardContent className="space-y-1">
						{visibleTemplateKeys.map((t) => {
							const isActive = t.key === activeKey;
							return (
								<button
									key={t.key}
									onClick={() => setActiveKey(t.key)}
									className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
										isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
									}`}
								>
									<div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{categoryByKey[t.key] ?? "ALL"}</div>
									<div className="font-medium">{t.name}</div>
									<div className="text-xs text-muted-foreground">{t.description}</div>
								</button>
							);
						})}
					</CardContent>
				</Card>

				{createOpen ? (
					<div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 px-4 py-10">
						<div className="w-full max-w-md rounded-2xl border border-border/70 bg-background p-6 shadow-2xl">
							<div className="mb-4">
								<h3 className="text-lg font-semibold text-foreground">Add template</h3>
								<p className="text-sm text-muted-foreground">Create a new template with a unique key.</p>
							</div>
							<div className="space-y-3">
								<InputField name="create_key" label="Key" value={createKey} onChange={(e) => setCreateKey(e.target.value)} placeholder="custom_key" />
								<InputField name="create_name" label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Custom template" />
								<SelectField
									name="create_category"
									label="Category"
									value={createCategory}
									onChange={(e) => setCreateCategory(e.target.value as "ADMIN" | "EXPLORER" | "ORGANIZER" | "ALL")}
									options={categoryOptions}
								/>
								{createError ? <p className="text-sm text-destructive">{createError}</p> : null}
							</div>
							<div className="mt-6 flex justify-end gap-2">
								<CtaButton color="whiteBorder" size="sm" type="button" onClick={() => setCreateOpen(false)} disabled={isPending}>
									Close
								</CtaButton>
								<CtaButton color="black" size="sm" type="button" onClick={onCreateTemplate} disabled={isPending}>
									Add
								</CtaButton>
							</div>
						</div>
					</div>
				) : null}
			</div>
			<div className="lg:col-span-4 space-y-4">
				<Card className="border-border/60 bg-background/80">
					<div className="lg:col-span-4">
						<form action={onSave} className="grid gap-6">
							<input type="hidden" name="key" value={activeKey} />

							<InputField
								name="name"
								label="Template name"
								defaultValue={active?.name ?? defaultTemplateKeys.find((d) => d.key === activeKey)?.name ?? ""}
								error={errors.name}
							/>

							<SelectField name="category" label="Category" defaultValue={active?.category ?? "ALL"} options={categoryOptions} />

							<InputField name="subject" label="Subject" defaultValue={active?.subject ?? ""} error={errors.subject} />

							<InputField
								name="logoUrl"
								label="Logo URL (optional)"
								defaultValue={active?.logoUrl ?? ""}
								placeholder="https://.../logo.png"
								caption={<span>Used as {"{{ logoUrl }}"} in templates. If empty, default brand is used.</span>}
							/>

							<FormField error={errors.html}>
								<div className="flex items-center justify-between">
									<FormLabel>HTML body</FormLabel>
									<div className="inline-flex items-center gap-1 rounded-md border border-border/60 p-1 text-xs">
										<button
											type="button"
											onClick={() => setHtmlEditorMode("code")}
											className={`rounded px-2 py-1 ${
												htmlEditorMode === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
											}`}
										>
											Code
										</button>
										<button
											type="button"
											onClick={() => setHtmlEditorMode("preview")}
											className={`rounded px-2 py-1 ${
												htmlEditorMode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
											}`}
										>
											Preview
										</button>
									</div>
								</div>
								<FormControl>
									{htmlEditorMode === "code" ? (
										<div className="rounded-md border border-input bg-background">
											<input type="hidden" name="html" value={htmlValue} />
											<CodeEditor value={htmlValue} onChange={setHtmlValue} language="html" height={400} ariaLabel="Email template HTML editor" />
										</div>
									) : (
										<div className="rounded-md border border-input bg-background">
											{/* Keep form data in sync while previewing */}
											<input type="hidden" name="html" value={htmlValue} />
											<div className="h-[400px] overflow-auto">
												<iframe title="HTML preview" srcDoc={previewHtml} className="h-[400px] w-full rounded-[5px]" style={{ border: 0 }} />
											</div>
										</div>
									)}
									<FormDescription>
										Supports variables like {"{{ name }}"}. Preview replaces known variables such as {"{{ logoUrl }}"}.
									</FormDescription>
									<FormMessage />
								</FormControl>
							</FormField>

							<TextareaField name="text" label="Text fallback (optional)" defaultValue={active?.text ?? ""} />

							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-3">
									<CtaButton
										color="whiteBorder"
										size="sm"
										type="button"
										onClick={() => {
											setTestEmail("");
											setTestStatus(null);
											setTestOpen(true);
										}}
										disabled={isPending}
									>
										Send test
									</CtaButton>
									{testOpen ? (
										<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 py-10">
											<div className="w-full max-w-md rounded-2xl border border-border/70 bg-background p-6 shadow-2xl">
												<div className="mb-4">
													<h3 className="text-lg font-semibold text-foreground">Send test email</h3>
													<p className="text-sm text-muted-foreground">Enter a recipient address to receive a test using the current template.</p>
												</div>
												<div className="space-y-3">
													<FormField>
														<FormLabel>Recipient email</FormLabel>
														<FormControl>
															<FormInput type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
														</FormControl>
													</FormField>
													{testStatus ? (
														<p className={`text-sm ${testStatus.startsWith("Sent") ? "text-emerald-600" : "text-destructive"}`}>{testStatus}</p>
													) : null}
												</div>
												<div className="mt-6 flex justify-end gap-2">
													<CtaButton color="whiteBorder" size="sm" type="button" onClick={() => setTestOpen(false)} disabled={isPending}>
														Close
													</CtaButton>
													<CtaButton color="black" size="sm" type="button" onClick={onSendTest} disabled={isPending}>
														{isPending ? "Sending..." : "Send"}
													</CtaButton>
												</div>
											</div>
										</div>
									) : null}
								</div>
								<CtaButton color="black" size="sm" type="submit" disabled={isPending}>
									{isPending ? "Saving..." : "Save template"}
								</CtaButton>
							</div>
						</form>
					</div>
				</Card>
			</div>
		</div>
	);
}
