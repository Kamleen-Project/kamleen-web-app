"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmailConfigForm } from "./email-config-form";

export function EmailConfigModal() {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const close = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				close();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.classList.add("overflow-hidden");

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.classList.remove("overflow-hidden");
		};
	}, [close, open]);

	const formId = "email-config-form";

	const modal =
		!mounted || !open
			? null
			: createPortal(
					<div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" onClick={close}>
						<div
							onClick={(e) => e.stopPropagation()}
							className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-border/60 bg-background text-foreground shadow-2xl"
						>
							<button
								type="button"
								onClick={close}
								className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
								aria-label="Close email configuration"
							>
								<X className="size-5" />
							</button>

							<div className="flex h-[70vh] flex-col">
								<div className="shrink-0 border-b border-border/60 p-6">
									<div className="space-y-1 pr-10">
										<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin settings</p>
										<h2 className="text-xl font-semibold text-foreground">Email configuration</h2>
										<p className="text-sm text-muted-foreground">Set SMTP credentials and sender identity for kamleen.com.</p>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-6">
									<EmailConfigForm formId={formId} />
								</div>
								<div className="shrink-0 border-t border-border/60 p-6">
									<div className="flex justify-end">
										<Button type="submit" form={formId}>
											Save settings
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>,
					document.body
			  );

	return (
		<>
			<Button type="button" variant="ghost" size="icon" className="size-12" onClick={() => setOpen(true)} aria-label="Open email configuration">
				<Settings className="size-5" />
			</Button>
			{modal}
		</>
	);
}
