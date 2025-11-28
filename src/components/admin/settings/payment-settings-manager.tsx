"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CtaButton } from "@/components/ui/cta-button";
import { InputField } from "@/components/ui/input-field";
import { SelectField } from "@/components/ui/select-field";
import { ToggleField } from "@/components/ui/toggle-field";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";

type Gateway = {
	key: string;
	name: string;
	type: "CARD" | "CASH" | "PAYPAL";
	logoUrl?: string | null;
	config?: any;
	testMode: boolean;
	isEnabled: boolean;
};

export function PaymentSettingsManager() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [gateways, setGateways] = useState<Gateway[]>([]);
	const [saving, setSaving] = useState(false);
	const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			try {
				const r = await fetch("/api/admin/payment-gateways", { cache: "no-store" });
				const data = (await r.json()) as { gateways: Gateway[] };
				if (mounted) setGateways(Array.isArray(data.gateways) ? data.gateways : []);
			} catch {
				if (mounted) setError("Failed to load gateways");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	async function saveAll() {
		setSaving(true);
		setOk(null);
		setError(null);
		try {
			for (const g of gateways) {
				const res = await fetch(`/api/admin/payment-gateways/${g.key}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: g.name,
						type: g.type,
						logoUrl: g.logoUrl ?? null,
						config: g.config ?? {},
						testMode: g.testMode,
						isEnabled: g.isEnabled,
					}),
				});
				if (!res.ok) throw new Error();
			}
			setOk("Saved");
		} catch {
			setError("Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function uploadLogoFor(key: string, file: File): Promise<string | null> {
		const form = new FormData();
		form.set("file", file);
		const res = await fetch(`/api/admin/payment-gateways/${key}/logo`, { method: "POST", body: form });
		if (!res.ok) return null;
		const data = (await res.json()) as { url?: string };
		return data.url ?? null;
	}

	function updateConfig(idx: number, key: string, value: string) {
		const copy = [...gateways];
		const g = copy[idx];
		copy[idx] = { ...g, config: { ...g.config, [key]: value } };
		setGateways(copy);
	}

	if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

	return (
		<div className="space-y-6">
			{gateways.length === 0 ? (
				<div className="text-sm text-muted-foreground">No payment gateways found. Seed or create gateways to configure payments.</div>
			) : null}
			{gateways.map((g, idx) => {
				return (
					<div key={g.key} className="rounded-lg border border-border/60">
						<div
							role="button"
							tabIndex={0}
							onClick={() => setOpenMap((m) => ({ ...m, [g.key]: !m[g.key] }))}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") setOpenMap((m) => ({ ...m, [g.key]: !m[g.key] }));
							}}
							className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
						>
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium">{g.name || g.key}</span>
								<span className="text-xs text-muted-foreground">{g.type}</span>
							</div>
							<div className="flex items-center gap-3">
								<ToggleField
									label="Test mode"
									checked={g.testMode}
									onChange={(n) => {
										const copy = [...gateways];
										copy[idx] = { ...g, testMode: n };
										setGateways(copy);
									}}
								/>
								<ToggleField
									label="Enabled"
									checked={g.isEnabled}
									onChange={(n) => {
										const copy = [...gateways];
										copy[idx] = { ...g, isEnabled: n };
										setGateways(copy);
									}}
								/>

								<ChevronDown className={"size-4 transition " + (openMap[g.key] ? "rotate-180" : "rotate-0")} />
							</div>
						</div>
						{openMap[g.key] ? (
							<div className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-3">
								<UploadSinglePicture
									aspect="twentyOneNine"
									objectFit="contain"
									previewUrl={g.logoUrl ?? null}
									onChangeFile={async (file) => {
										const url = await uploadLogoFor(g.key, file);
										if (!url) return;
										const copy = [...gateways];
										copy[idx] = { ...g, logoUrl: url };
										setGateways(copy);
									}}
									onRemove={() => {
										const copy = [...gateways];
										copy[idx] = { ...g, logoUrl: null };
										setGateways(copy);
									}}
									uploadLabel="Upload logo"
									className="w-40"
								/>
								<div className="space-y-2">
									<InputField
										label="Name"
										value={g.name}
										onChange={(e) => {
											const copy = [...gateways];
											copy[idx] = { ...g, name: e.target.value };
											setGateways(copy);
										}}
									/>
									<InputField label="Key" value={g.key} disabled />
								</div>
								<div className="space-y-2">
									<SelectField
										label="Type"
										value={g.type}
										onChange={(e) => {
											const copy = [...gateways];
											copy[idx] = { ...g, type: e.target.value as Gateway["type"] };
											setGateways(copy);
										}}
										options={[
											{ label: "Card", value: "CARD" },
											{ label: "PayPal", value: "PAYPAL" },
											{ label: "Cash", value: "CASH" },
										]}
									/>
								</div>

								<div className="col-span-full border-t border-border/40 pt-4">
									<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</p>
									<div className="grid gap-4 sm:grid-cols-2">
										{g.key === "stripe" ? (
											<>
												<InputField
													label="Publishable Key"
													value={g.config?.publishableKey || ""}
													onChange={(e) => updateConfig(idx, "publishableKey", e.target.value)}
													placeholder="pk_test_..."
												/>
												<InputField
													label="Secret Key"
													value={g.config?.secretKey || ""}
													onChange={(e) => updateConfig(idx, "secretKey", e.target.value)}
													placeholder="sk_test_..."
													type="password"
												/>
												<InputField
													label="Webhook Secret"
													value={g.config?.webhookSecret || ""}
													onChange={(e) => updateConfig(idx, "webhookSecret", e.target.value)}
													placeholder="whsec_..."
													type="password"
												/>
											</>
										) : g.key === "paypal" ? (
											<>
												<InputField
													label="Client ID"
													value={g.config?.clientId || ""}
													onChange={(e) => updateConfig(idx, "clientId", e.target.value)}
												/>
												<InputField
													label="Client Secret"
													value={g.config?.clientSecret || ""}
													onChange={(e) => updateConfig(idx, "clientSecret", e.target.value)}
													type="password"
												/>
											</>
										) : (g.key === "payzone" || g.key === "cmi") ? (
											<>
												<InputField
													label="Merchant/Client ID"
													value={g.config?.clientId || ""}
													onChange={(e) => updateConfig(idx, "clientId", e.target.value)}
												/>
												<InputField
													label="Secret/Hash Key"
													value={g.config?.secretKey || ""}
													onChange={(e) => updateConfig(idx, "secretKey", e.target.value)}
													type="password"
												/>
												<InputField
													label="Gateway URL"
													value={g.config?.gatewayUrl || ""}
													onChange={(e) => updateConfig(idx, "gatewayUrl", e.target.value)}
													placeholder="https://..."
												/>
											</>
										) : (
											<div className="col-span-full">
												<p className="text-sm text-muted-foreground">No specific configuration needed for this provider.</p>
											</div>
										)}
									</div>
								</div>
							</div>
						) : null}
					</div>
				);
			})}
			<div className="flex items-center gap-3">
				<CtaButton onClick={saveAll} disabled={saving} color="black">
					{saving ? "Saving…" : "Save settings"}
				</CtaButton>
				{ok ? <span className="text-xs text-green-600">{ok}</span> : null}
				{error ? <span className="text-xs text-red-600">{error}</span> : null}
			</div>
		</div>
	);
}
