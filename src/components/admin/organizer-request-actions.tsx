"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export function OrganizerRequestActions({
	userId,
	userRole,
	name,
	email,
	image,
	gender,
	birthDate,
	headline,
	bio,
	status,
}: {
	userId: string;
	userRole: string;
	name: string | null;
	email: string | null;
	image: string | null;
	gender: string | null;
	birthDate: string | Date | null;
	headline: string | null;
	bio: string | null;
	status: string;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
	const [rejectNote, setRejectNote] = useState("");

	function updateRequest(nextStatus: "APPROVED" | "REJECTED", note?: string) {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const payload: Record<string, string> = {
				organizerStatus: nextStatus,
				activeRole: nextStatus === "APPROVED" ? "ORGANIZER" : "EXPLORER",
			};
			if (nextStatus === "APPROVED" && userRole !== "ADMIN") {
				payload.role = "ORGANIZER";
			}
			if (typeof note === "string" && note.trim()) {
				payload.clarification = note.trim();
			}

			const response = await fetch(`/api/admin/users/${userId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { message?: string } | null;
				setError(data?.message ?? "Unable to update request");
				return;
			}

			setMessage(nextStatus === "APPROVED" ? "Request approved" : "Request rejected");
			if (nextStatus === "REJECTED") {
				setConfirmRejectOpen(false);
				setRejectNote("");
			}
			router.refresh();
		});
	}

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<CtaButton size="md" color="black" label="Review" />
				</DialogTrigger>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Review organizer request</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div className="flex flex-row gap-2">
							<div className="shrink-0 overflow-hidden rounded-lg border border-border/60 w-32 h-32">
								<ImageWithFallback src={image || "/images/image-placeholder.png"} width={128} height={128} alt={(name ?? email ?? "Organizer") as string} />
							</div>
							<div className="rounded-lg flex-1 border border-border/60 p-3">
								<div className="flex items-start gap-3">
									<div className="text-sm text-muted-foreground">
										<p className="text-foreground">{name ?? email ?? "Unknown"}</p>
										{email ? <p className="mt-0.5">{email}</p> : null}
										{gender ? (
											<p className="mt-0.5 capitalize">
												Gender: <span className="text-foreground font-medium">{String(gender).toLowerCase().replace(/_/g, " ")}</span>
											</p>
										) : null}
										{birthDate ? (
											<p className="mt-0.5">
												Birth date: <span className="text-foreground font-medium">{new Date(birthDate).toLocaleDateString("en")}</span>
											</p>
										) : null}
										<p className="mt-1 text-xs">
											Status: <span className="font-medium text-foreground">{status}</span>
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="rounded-lg border border-border/60 p-3">
							<p className="text-sm font-medium text-foreground">Request details</p>
							<div className="mt-2 space-y-3">
								<div>
									<p className="text-xs font-semibold text-foreground/80">About you</p>
									{headline ? (
										<p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{headline}</p>
									) : (
										<p className="mt-1 text-sm text-muted-foreground">No answer provided.</p>
									)}
								</div>
								<div>
									<p className="text-xs font-semibold text-foreground/80">About your experiences</p>
									{bio ? (
										<p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{bio}</p>
									) : (
										<p className="mt-1 text-sm text-muted-foreground">No answer provided.</p>
									)}
								</div>
							</div>
							{error ? <p className="text-xs text-destructive">{error}</p> : null}
							{!error && message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
						</div>
					</div>
					<DialogFooter className="gap-2">
						<DialogClose asChild>
							<CtaButton color="whiteBorder" size="md" label="Close" />
						</DialogClose>
						<CtaButton
							size="md"
							color="whiteBorder"
							className="text-red-600 border-red-300 hover:bg-red-50"
							label="Reject"
							onClick={() => setConfirmRejectOpen(true)}
							isLoading={pending}
							startIcon={<X />}
						/>
						<CtaButton size="md" color="black" label="Approve" onClick={() => updateRequest("APPROVED")} isLoading={pending} startIcon={<Check />} />
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Confirm rejection modal */}
			<Dialog open={confirmRejectOpen} onOpenChange={setConfirmRejectOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Confirm rejection</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">Are you sure you want to reject this organizer request?</p>
						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium text-foreground">Clarification (optional)</p>
							<TextareaField
								value={rejectNote}
								onChange={(e) => setRejectNote(e.target.value)}
								rows={3}
								placeholder="Include a note to the applicant (optional)"
							/>
						</div>
					</div>
					<DialogFooter className="gap-2 justify-end">
						<DialogClose asChild>
							<CtaButton color="whiteBorder" size="md" label="Cancel" />
						</DialogClose>
						<CtaButton
							size="md"
							color="whiteBorder"
							className="text-red-600 border-red-300 hover:bg-red-50"
							label="Reject"
							onClick={() => updateRequest("REJECTED", rejectNote)}
							isLoading={pending}
							startIcon={<X />}
						/>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
