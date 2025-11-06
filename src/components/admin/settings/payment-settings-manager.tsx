"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CtaButton } from "@/components/ui/cta-button";
import { InputField } from "@/components/ui/input-field";
import { SelectField } from "@/components/ui/select-field";
import { ToggleField } from "@/components/ui/toggle-field";

type Settings = {
	id: string;
	defaultProvider: "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL";
	enabledProviders: ("STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL")[];
	stripePublishableKey?: string | null;
	stripeAccountCountry?: string | null;
	cmiMerchantId?: string | null;
	cmiTerminalId?: string | null;
	cmiCurrency?: string | null;
	payzoneMerchantId?: string | null;
	payzoneSiteId?: string | null;
	payzoneCurrency?: string | null;
	payzoneGatewayUrl?: string | null;
	paypalClientId?: string | null;
	payload?: never; // keep shape stable
	paypalClientSecret?: string | null;
	testMode: boolean;
};

export function PaymentSettingsManager() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [settings, setSettings] = useState<Settings | null>(null);

	// use ToggleField from our UI kit

	const enabledSet = useMemo(() => new Set(settings?.enabledProviders ?? []), [settings]);
	const isEnabled = (p: "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL") => enabledSet.has(p);
	const setEnabled = (p: "STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL", next: boolean) => {
		if (!settings) return;
		const set = new Set(settings.enabledProviders);
		if (next) set.add(p);
		else set.delete(p);
		setSettings({ ...settings, enabledProviders: Array.from(set) as ("STRIPE" | "CMI" | "PAYZONE" | "CASH" | "PAYPAL")[] });
	};

	const [openStripe, setOpenStripe] = useState(true);
	const [openCmi, setOpenCmi] = useState(false);
	const [openPayzone, setOpenPayzone] = useState(false);
	const [openCash, setOpenCash] = useState(false);
	const [openPaypal, setOpenPaypal] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			try {
				const r = await fetch("/api/admin/settings/payments", { cache: "no-store" });
				const data = (await r.json()) as { settings: Settings | null };
				if (mounted) setSettings(data.settings);
			} catch (e) {
				if (mounted) setError("Failed to load settings");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	async function save() {
		if (!settings) return;
		setSaving(true);
		setError(null);
		setOk(null);
		try {
			const r = await fetch("/api/admin/settings/payments", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					defaultProvider: settings.defaultProvider,
					enabledProviders: settings.enabledProviders,
					stripePublishableKey: settings.stripePublishableKey ?? undefined,
					stripeAccountCountry: settings.stripeAccountCountry ?? undefined,
					cmiMerchantId: settings.cmiMerchantId ?? undefined,
					cmiTerminalId: settings.cmiTerminalId ?? undefined,
					cmiCurrency: settings.cmiCurrency ?? undefined,
					payzoneMerchantId: settings.payzoneMerchantId ?? undefined,
					payzoneSiteId: settings.payzoneSiteId ?? undefined,
					payzoneCurrency: settings.payzoneCurrency ?? undefined,
					payzoneGatewayUrl: settings.payzoneGatewayUrl ?? undefined,
					paypalClientId: settings.paypalClientId ?? undefined,
					paypalClientSecret: settings.paypalClientSecret ?? undefined,
					testMode: settings.testMode,
				}),
			});
			if (!r.ok) throw new Error();
			setOk("Saved");
		} catch (e) {
			setError("Failed to save settings");
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
	if (!settings) return <div className="text-sm text-muted-foreground">No settings found.</div>;

	// function toggleEnabled(provider: "STRIPE" | "CMI" | "PAYZONE") {
	// 	if (!settings) return;
	// 	const set = new Set(settings.enabledProviders);
	// 	if (set.has(provider)) set.delete(provider);
	// 	else set.add(provider);
	// 	setSettings({ ...settings, enabledProviders: Array.from(set) as ("STRIPE" | "CMI" | "PAYZONE")[] });
	// }

	return (
		<div className="space-y-6">
			<div className="grid gap-4 mt-4">
				<SelectField
					label="Default provider"
					value={settings.defaultProvider}
					onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value as Settings["defaultProvider"] })}
					options={[
						{ label: "Stripe", value: "STRIPE" },
						{ label: "CMI", value: "CMI" },
						{ label: "Payzone", value: "PAYZONE" },
						{ label: "Cash", value: "CASH" },
						{ label: "PayPal", value: "PAYPAL" },
					]}
				/>

				{/* <div className="self-end text-xs text-muted-foreground">Enable providers and set the default. Secrets are managed via environment variables.</div> */}
			</div>

			{/* Stripe section */}
			<div className="rounded-lg border border-border/60">
				<div
					role="button"
					tabIndex={0}
					onClick={() => setOpenStripe((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setOpenStripe((v) => !v);
					}}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
				>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium">Stripe</span>
						<span className="text-xs text-muted-foreground">Checkout and webhooks</span>
					</div>
					<div className="flex items-center gap-3">
						<ToggleField label="Enabled " checked={isEnabled("STRIPE")} onChange={(n) => setEnabled("STRIPE", n)} />
						<ChevronDown className={"size-4 transition " + (openStripe ? "rotate-180" : "rotate-0")} />
					</div>
				</div>
				{openStripe ? (
					<div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2">
						<InputField
							label="Publishable key"
							placeholder="pk_…"
							value={settings.stripePublishableKey ?? ""}
							onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
						/>
						<InputField
							label="Account country"
							placeholder="e.g., US"
							value={settings.stripeAccountCountry ?? ""}
							onChange={(e) => setSettings({ ...settings, stripeAccountCountry: e.target.value })}
						/>
						<p className="col-span-full text-xs text-muted-foreground">Secret key and webhook secret must be set as env vars.</p>
					</div>
				) : null}
			</div>

			{/* CMI section */}
			<div className="rounded-lg border border-border/60">
				<div
					role="button"
					tabIndex={0}
					onClick={() => setOpenCmi((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setOpenCmi((v) => !v);
					}}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
				>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium">CMI</span>
						<span className="text-xs text-muted-foreground">Hosted 3‑D Secure checkout</span>
					</div>
					<div className="flex items-center gap-3">
						<ToggleField label="Enabled" checked={isEnabled("CMI")} onChange={(n) => setEnabled("CMI", n)} />
						<ChevronDown className={"size-4 transition " + (openCmi ? "rotate-180" : "rotate-0")} />
					</div>
				</div>
				{openCmi ? (
					<div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-3">
						<InputField
							label="Merchant ID"
							value={settings.cmiMerchantId ?? ""}
							onChange={(e) => setSettings({ ...settings, cmiMerchantId: e.target.value })}
						/>
						<InputField
							label="Terminal ID"
							value={settings.cmiTerminalId ?? ""}
							onChange={(e) => setSettings({ ...settings, cmiTerminalId: e.target.value })}
						/>
						<InputField
							label="Currency"
							placeholder="e.g., MAD"
							value={settings.cmiCurrency ?? ""}
							onChange={(e) => setSettings({ ...settings, cmiCurrency: e.target.value })}
						/>
						<p className="col-span-full text-xs text-muted-foreground">Store key/secret must be set as env vars.</p>
					</div>
				) : null}
			</div>

			{/* Payzone section */}
			<div className="rounded-lg border border-border/60">
				<div
					role="button"
					tabIndex={0}
					onClick={() => setOpenPayzone((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setOpenPayzone((v) => !v);
					}}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
				>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium">Payzone</span>
						<span className="text-xs text-muted-foreground">Hosted checkout / IPN</span>
					</div>
					<div className="flex items-center gap-3">
						<ToggleField label="Enabled" checked={isEnabled("PAYZONE")} onChange={(n) => setEnabled("PAYZONE", n)} />
						<ChevronDown className={"size-4 transition " + (openPayzone ? "rotate-180" : "rotate-0")} />
					</div>
				</div>
				{openPayzone ? (
					<div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2">
						<InputField
							label="Merchant ID"
							value={settings.payzoneMerchantId ?? ""}
							onChange={(e) => setSettings({ ...settings, payzoneMerchantId: e.target.value })}
						/>
						<InputField label="Site ID" value={settings.payzoneSiteId ?? ""} onChange={(e) => setSettings({ ...settings, payzoneSiteId: e.target.value })} />
						<InputField
							label="Currency"
							placeholder="e.g., MAD"
							value={settings.payzoneCurrency ?? ""}
							onChange={(e) => setSettings({ ...settings, payzoneCurrency: e.target.value })}
						/>
						<InputField
							label="Gateway URL"
							value={settings.payzoneGatewayUrl ?? ""}
							onChange={(e) => setSettings({ ...settings, payzoneGatewayUrl: e.target.value })}
						/>
						<p className="col-span-full text-xs text-muted-foreground">Secret key must be set as PAYZONE_SECRET_KEY env var.</p>
					</div>
				) : null}
			</div>

			{/* PayPal section */}
			<div className="rounded-lg border border-border/60">
				<div
					role="button"
					tabIndex={0}
					onClick={() => setOpenPaypal((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setOpenPaypal((v) => !v);
					}}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
				>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium">PayPal</span>
						<span className="text-xs text-muted-foreground">Redirect checkout (env: PAYPAL_CLIENT_ID/SECRET)</span>
					</div>
					<div className="flex items-center gap-3">
						<ToggleField label="Enabled" checked={isEnabled("PAYPAL")} onChange={(n) => setEnabled("PAYPAL", n)} />
						<ChevronDown className={"size-4 transition " + (openPaypal ? "rotate-180" : "rotate-0")} />
					</div>
				</div>
				{openPaypal ? (
					<div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2">
						<InputField
							label="Client ID"
							placeholder="PayPal Client ID"
							value={settings.paypalClientId ?? ""}
							onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
						/>
						<InputField
							label="Client Secret"
							placeholder="PayPal Client Secret"
							type="password"
							value={settings.paypalClientSecret ?? ""}
							onChange={(e) => setSettings({ ...settings, paypalClientSecret: e.target.value })}
						/>
						<p className="col-span-full text-xs text-muted-foreground">
							These credentials will be stored in the database. Leave blank to use environment variables.
						</p>
					</div>
				) : null}
			</div>

			{/* Cash section */}
			<div className="rounded-lg border border-border/60">
				<div
					role="button"
					tabIndex={0}
					onClick={() => setOpenCash((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setOpenCash((v) => !v);
					}}
					className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
				>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium">Cash</span>
						<span className="text-xs text-muted-foreground">Pay on cash (no external gateway)</span>
					</div>
					<div className="flex items-center gap-3">
						<ToggleField label="Enabled" checked={isEnabled("CASH")} onChange={(n) => setEnabled("CASH", n)} />
						<ChevronDown className={"size-4 transition " + (openCash ? "rotate-180" : "rotate-0")} />
					</div>
				</div>
				{openCash ? (
					<div className="grid gap-3 border-t border-border/60 p-4">
						<p className="text-sm text-muted-foreground">No configuration needed. Ensure operational process for collecting cash on arrival.</p>
					</div>
				) : null}
			</div>

			<div className="flex ">
				<SelectField
					label="Mode"
					value={settings.testMode ? "test" : "production"}
					onChange={(e) => setSettings({ ...settings, testMode: e.target.value === "test" })}
					options={[
						{ label: "Test mode", value: "test" },
						{ label: "Production mode", value: "production" },
					]}
				/>
			</div>
			<div className="flex mt-4">
				<CtaButton onClick={save} disabled={saving} color="black">
					{saving ? "Saving…" : "Save settings"}
				</CtaButton>
				{ok ? <span className="text-xs text-green-600">{ok}</span> : null}
				{error ? <span className="text-xs text-red-600">{error}</span> : null}
			</div>
		</div>
	);
}
