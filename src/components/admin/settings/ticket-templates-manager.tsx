"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormControl, FormField, FormInput, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import { InputField } from "@/components/ui/input-field";
import { CodeEditor } from "@/components/ui/code-editor";

type TicketTemplate = {
	id: string;
	name: string;
	html: string;
	isActive: boolean;
	updatedAt: string;
};

export function TicketTemplatesManager() {
	const [isPending, startTransition] = useTransition();
	const [templates, setTemplates] = useState<TicketTemplate[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<TicketTemplate | null>(null);
	const [htmlEditorMode, setHtmlEditorMode] = useState<"code" | "preview">("preview");
	const [htmlValue, setHtmlValue] = useState<string>("");

	const selected = useMemo(() => templates.find((t) => t.id === activeId) ?? templates[0], [templates, activeId]);

	useEffect(() => {
		startTransition(async () => {
			const res = await fetch("/api/admin/settings/ticket-templates");
			if (res.ok) {
				const data = (await res.json()) as { templates: TicketTemplate[] };
				setTemplates(data.templates);
			}
		});
	}, []);

	useEffect(() => {
		setHtmlValue(selected?.html ?? "");
		setHtmlEditorMode("preview");
	}, [selected?.id, selected?.html]);

	const previewHtml = useMemo(() => {
		const variables: Record<string, string> = {
			code: "T-TEST-ABC123",
			seatNumber: "1",
			experienceTitle: "Sample Experience Title",
			meetingAddress: "123 Main Street, City",
			sessionStart: new Date().toLocaleString(),
			sessionDate: "Saturday 18 Oct 2025",
			sessionTimeStart: "16:00",
			sessionTimeEnd: "18:00",
			sessionTimeRange: "16:00 to 18:00",
			sessionDuration: "2h 00m",
			pricePerSpot: "49.00 USD / Spot",
			sessionWeekday: "Saturday",
			sessionDay: "18",
			sessionMonth: "October",
			sessionYear: "2025",
			experienceUrl: "https://kamleen.com/experiences/sample-experience-title",
			qrcodeDataUrl: "qrcode://https://kamleen.com/experiences/sample-experience-title",
			reservationDate: "13 Oct 2025",
			organizerName: "Jane Organizer",
			explorerName: "John Doe",
			logoDataUrl: "/images/logo.png",
			logoWhiteDataUrl: "/images/logo-w.png",
			experienceCoverDataUrl: "/images/placeholder-experience.svg",
			patternDataUrl: "/images/pattern.png",
			brandName: "Kamleen",
			// Use a special barcode:// scheme so preview can render a real barcode SVG in-place
			barcodeDataUrl: "barcode://T-TEST-ABC123",
		};
		const content = (htmlValue ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => variables[k] ?? "");
		return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="/" />
    <style>
      :root { --text:#0b0d12; --muted:#6b7280; }
      html, body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--text); }
      .page { width: 420px; height: 840px; padding: 0px; box-sizing: border-box; }
      .muted { color: var(--muted); }
      img { max-width: 100%; height: auto; }
      .ticket { display: flex; flex-direction: column; height: 100%; box-sizing: border-box;}
      .ticket-bottom { margin-top: auto; }
    </style>
		<script defer src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
		<script defer src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
  </head>
  <body>
    <section class="page">${content}</section>
    <script>
      (function() {
        function renderBarcodes() {
          if (typeof window.JsBarcode === 'undefined') { return; }
          var nodes = document.querySelectorAll('img[src^="barcode://"]');
          for (var i = 0; i < nodes.length; i++) {
            var img = nodes[i];
            var src = img.getAttribute('src') || '';
            var value = src.replace('barcode://','') || 'T-TEST-ABC123';
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            // Try to carry over sizing from the img element
            var style = img.getAttribute('style');
            if (style) { svg.setAttribute('style', style); }
            svg.setAttribute('height', '56');
            img.parentNode.insertBefore(svg, img);
            img.parentNode.removeChild(img);
            try {
              window.JsBarcode(svg, value, { format: 'CODE128', displayValue: true, fontSize: 12, height: 56, margin: 0 });
            } catch (e) {}
          }
        }
	        function renderQRCodes() {
	          if (typeof window.QRCode === 'undefined' && typeof window.QRCodeGenerator === 'undefined') { return; }
	          var nodes = document.querySelectorAll('img[src^="qrcode://"]');
	          for (var i = 0; i < nodes.length; i++) {
	            var img = nodes[i];
	            var src = img.getAttribute('src') || '';
	            var value = src.replace('qrcode://','');
	            if (!value) continue;
	            try {
	              // Use the QRCode library to draw to canvas and replace image
	              var canvas = document.createElement('canvas');
	              var size = 128;
	              canvas.width = size; canvas.height = size;
	              var opts = { errorCorrectionLevel: 'M', width: size, margin: 1 };
	              if (window.QRCode && window.QRCode.toCanvas) {
	                window.QRCode.toCanvas(canvas, value, opts, function(){});
	              } else if (window.QRCodeGenerator && window.QRCodeGenerator.toCanvas) {
	                window.QRCodeGenerator.toCanvas(canvas, value, opts);
	              }
	              var dataUrl = canvas.toDataURL('image/png');
	              img.setAttribute('src', dataUrl);
	            } catch (e) {}
	          }
	        }
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
	          renderBarcodes();
	          renderQRCodes();
        } else {
	          document.addEventListener('DOMContentLoaded', function(){ renderBarcodes(); renderQRCodes(); });
        }
      })();
    </script>
  </body>
</html>`;
	}, [htmlValue]);

	async function saveTemplate(form: FormData) {
		setErrors({});
		const id = selected?.id;
		const payload = {
			name: (form.get("name") as string) ?? "",
			html: (form.get("html") as string) ?? "",
		};
		if (!payload.name?.trim()) {
			setErrors((e) => ({ ...e, name: "Name is required" }));
			return;
		}
		if (!payload.html?.trim()) {
			setErrors((e) => ({ ...e, html: "HTML is required" }));
			return;
		}
		startTransition(async () => {
			const res = await fetch(`/api/admin/settings/ticket-templates/${id}`, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				const list = await fetch("/api/admin/settings/ticket-templates");
				const data = (await list.json()) as { templates: TicketTemplate[] };
				setTemplates(data.templates);
			}
		});
	}

	async function createTemplate() {
		if (!createName.trim()) return;
		startTransition(async () => {
			const defaultHtml = `
		<div class="ticket">
		  <!-- Decorative pattern background -->
		  <div style="position:absolute;inset:0;opacity:0.08;background-image:url('{{ patternDataUrl }}');background-size:600px;background-repeat:repeat;"></div>
		  <!-- Cover image -->
		  <div style="height:120px;width:100%;overflow:hidden;position:relative;">
			<img alt="cover" src="{{ experienceCoverDataUrl }}" style="height:120px;width:100%;object-fit:cover;display:block;" />
		  </div>
		  <div style="position:relative;display:flex;flex-direction:column;height:calc(100% - 120px);padding:24px;box-sizing:border-box;">
			<!-- Logo -->
			<div style="margin-top:12px;margin-bottom:12px;">
			  <img alt="logo" src="{{ logoDataUrl }}" style="height:54px;width:auto;object-fit:contain;" />
			</div>
			<!-- Gradient band below logo -->
			<div style="height:100px;width:100%;background:linear-gradient(30deg,#ff512f,#dd2476);border-radius:12px;" />

			<!-- Title + organizer -->
			<div style="font-size:22px;font-weight:700;margin-top:16px;">
			  {{ experienceTitle }}
			</div>
			<div style="color:#6b7280;margin-top:4px;margin-bottom:12px;">By {{ organizerName }}</div>

			<!-- Date + Time -->
			<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
			  <div style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;">
				<!-- clock icon -->
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				  <circle cx="12" cy="12" r="10"></circle>
				  <polyline points="12 6 12 12 16 14"></polyline>
				</svg>
			  </div>
			  <div>
				<div style="font-size:14px;color:#6b7280;">{{ sessionDate }}</div>
				<div style="display:flex;align-items:baseline;gap:6px;">
				  <span style="font-size:18px;font-weight:600;">{{ sessionTimeStart }}</span>
				  <span style="font-size:14px;color:#6b7280;">to</span>
				  <span style="font-size:14px;">{{ sessionTimeEnd }}</span>
				</div>
			  </div>
			</div>

			<!-- Separated date format -->
			<div style="display:flex;gap:8px;color:#6b7280;margin-bottom:12px;">
			  <span>{{ sessionWeekday }},</span>
			  <span>{{ sessionDay }}</span>
			  <span>{{ sessionMonth }}</span>
			  <span>{{ sessionYear }}</span>
			</div>

			<!-- Meta grid -->
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:16px;">
			  <div>
				<div style="font-size:12px;color:#6b7280;">Duration</div>
				<div style="font-weight:600;">{{ sessionDuration }}</div>
			  </div>
			  <div>
				<div style="font-size:12px;color:#6b7280;">Price</div>
				<div style="font-weight:600;">{{ pricePerSpot }}</div>
			  </div>
			  <div>
				<div style="font-size:12px;color:#6b7280;">Ticket Number</div>
				<div style="font-weight:600;">{{ code }}</div>
			  </div>
			  <div>
				<div style="font-size:12px;color:#6b7280;">Seat Number</div>
				<div style="font-weight:600;">{{ seatNumber }}</div>
			  </div>
			  <div>
				<div style="font-size:12px;color:#6b7280;">Meeting Point</div>
				<div style="font-weight:600;">{{ meetingAddress }}</div>
			  </div>
			</div>

			<!-- Explorer + Reservation date -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
			  <div style="font-size:12px;color:#6b7280;">Explorer</div>
			  <div style="font-weight:600;">{{ explorerName }}</div>
			  <div style="font-size:12px;color:#6b7280;">Reservation</div>
			  <div style="font-weight:600;">{{ reservationDate }}</div>
			</div>

			<!-- QR + Barcode -->
			<div class="ticket-bottom">
			  <div style="display:flex;align-items:center;gap:16px;">
				<div style="width:96px;height:96px;">
				  <img alt="qrcode" src="{{ qrcodeDataUrl }}" style="width:96px;height:96px;object-fit:contain;" />
				</div>
				<div style="flex:1;text-align:center">
				  <img alt="barcode" src="{{ barcodeDataUrl }}" style="height:56px;width:100%;object-fit:contain;" />
				</div>
			  </div>
			  <div style="margin-top:16px;color:#6b7280;font-size:12px;text-align:center">
				Please arrive 10 minutes early. Bring a valid ID.
			  </div>
			</div>
		  </div>
		</div>`;
			const res = await fetch(`/api/admin/settings/ticket-templates`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: createName.trim(), html: defaultHtml }),
			});
			if (res.ok) {
				const list = await fetch("/api/admin/settings/ticket-templates");
				const data = (await list.json()) as { templates: TicketTemplate[] };
				setTemplates(data.templates);
				setCreateOpen(false);
				setCreateName("");
			}
		});
	}

	async function activateTemplate(id: string) {
		startTransition(async () => {
			const res = await fetch(`/api/admin/settings/ticket-templates/${id}/activate`, { method: "POST" });
			if (res.ok) {
				const data = (await res.json()) as { templates: TicketTemplate[] };
				setTemplates(data.templates);
			}
		});
	}

	async function deleteTemplate(id: string) {
		startTransition(async () => {
			const res = await fetch(`/api/admin/settings/ticket-templates/${id}`, { method: "DELETE" });
			if (res.ok) {
				const list = await fetch("/api/admin/settings/ticket-templates");
				const data = (await list.json()) as { templates: TicketTemplate[] };
				setTemplates(data.templates);
				setActiveId((prev) => (prev === id ? data.templates[0]?.id ?? null : prev));
				setDeleteTarget(null);
			}
		});
	}

	return (
		<div className="grid grid-cols-[260px_1fr] gap-4">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Templates</h3>
						<Button type="button" variant="outline" className="h-8 w-8 p-0" onClick={() => setCreateOpen(true)} title="Add template">
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-1">
						{templates.map((tpl) => (
							<div
								key={tpl.id}
								role="button"
								tabIndex={0}
								onClick={() => setActiveId(tpl.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setActiveId(tpl.id);
									}
								}}
								className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-left hover:bg-muted ${
									selected?.id === tpl.id ? "bg-muted" : ""
								}`}
							>
								<span className="truncate">{tpl.name}</span>
								<div className="flex items-center gap-2">
									{tpl.isActive ? (
										<CheckCircle2 className="h-4 w-4 text-primary" aria-label="Active" />
									) : (
										<Button
											variant="outline"
											className="h-8 w-8 p-0"
											onClick={(e) => {
												e.stopPropagation();
												activateTemplate(tpl.id);
											}}
											title="Set active"
										>
											<CheckCircle2 className="h-4 w-4" />
										</Button>
									)}
									<Button
										variant="outline"
										className="h-8 w-8 p-0"
										onClick={(e) => {
											e.stopPropagation();
											setDeleteTarget(tpl);
										}}
										title="Delete template"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="font-medium">Editor</div>
						<div className="inline-flex items-center gap-1 rounded-md border border-border/60 p-1 text-xs">
							<button
								type="button"
								onClick={() => setHtmlEditorMode("code")}
								className={`rounded px-2 py-1 ${htmlEditorMode === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
							>
								Code
							</button>
							<button
								type="button"
								onClick={() => setHtmlEditorMode("preview")}
								className={`rounded px-2 py-1 ${htmlEditorMode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
							>
								Preview
							</button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{selected ? (
						<form key={selected?.id} action={saveTemplate} className="flex flex-col gap-4">
							<InputField name="name" label="Name" defaultValue={selected?.name} error={errors.name} />
							<FormField>
								<div className="flex items-center justify-between">
									<FormLabel>HTML</FormLabel>
								</div>
								<FormControl>
									{htmlEditorMode === "code" ? (
										<div className="rounded-md border border-input bg-background">
											<input type="hidden" name="html" value={htmlValue} />
											<CodeEditor value={htmlValue} onChange={setHtmlValue} language="html" height={842} ariaLabel="Ticket template HTML editor" />
										</div>
									) : (
										<div className="rounded-md border border-input bg-background overflow-auto w-[422px]">
											<input type="hidden" name="html" value={htmlValue} />
											<iframe title="HTML preview" srcDoc={previewHtml} className="h-[842px] w-full no-border" />
										</div>
									)}
								</FormControl>
								<FormMessage>{errors.html}</FormMessage>
							</FormField>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={async () => {
										try {
											const res = await fetch(`/api/admin/settings/ticket-templates/preview`, {
												method: "POST",
												headers: { "content-type": "application/json" },
												body: JSON.stringify({ html: htmlValue }),
											});
											if (res.ok) {
												const blob = await res.blob();
												const url = URL.createObjectURL(blob);
												const a = document.createElement("a");
												a.href = url;
												a.download = "ticket-preview.pdf";
												document.body.appendChild(a);
												a.click();
												a.remove();
												URL.revokeObjectURL(url);
											}
										} catch {}
									}}
								>
									PDF Generator
								</Button>
								<Button type="submit" disabled={isPending}>
									Save
								</Button>
							</div>
						</form>
					) : (
						<div className="text-sm text-muted-foreground">No templates yet.</div>
					)}
				</CardContent>
			</Card>

			{deleteTarget ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
					<div className="w-[520px] rounded-lg border bg-background p-4 shadow-xl">
						<div className="mb-3 text-base font-medium">Delete ticket template</div>
						<p className="mb-4 text-sm text-muted-foreground">Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This action cannot be undone.</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteTarget(null)}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={() => deleteTemplate(deleteTarget.id)}>
								Delete
							</Button>
						</div>
					</div>
				</div>
			) : null}

			{createOpen ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
					<div className="w-[520px] rounded-lg border bg-background p-4 shadow-xl">
						<div className="mb-3 text-base font-medium">Create ticket template</div>
						<div className="mb-4">
							<FormField>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<FormInput value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="My ticket" />
								</FormControl>
							</FormField>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setCreateOpen(false)}>
								Cancel
							</Button>
							<Button onClick={createTemplate} disabled={!createName.trim()}>
								Create
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
