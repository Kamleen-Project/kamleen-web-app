"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogClose } from "@/components/ui/dialog";

export function ExperiencesActions({
	experienceId,
	bookingsCount = 0,
	reviewsCount = 0,
}: {
	experienceId: string;
	bookingsCount?: number;
	reviewsCount?: number;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [open, setOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="flex items-center gap-1.5">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" aria-label="More actions">
						<MoreHorizontal />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-48 p-1">
					<button
						className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
						onClick={() => {
							setOpen(false);
							setConfirmOpen(true);
						}}
					>
						<Trash2 className="h-4 w-4" />
						Delete experience…
					</button>
				</PopoverContent>
			</Popover>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogTitle>Delete this experience?</DialogTitle>
					<DialogDescription>This action cannot be undone. This will permanently delete the experience and all associated data.</DialogDescription>
					{bookingsCount > 0 || reviewsCount > 0 ? (
						<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
							<p className="mb-1 font-medium text-amber-900 dark:text-amber-200">This experience has related records:</p>
							<ul className="list-inside list-disc text-foreground">
								{bookingsCount > 0 ? (
									<li>
										Reservations: <strong>{bookingsCount}</strong>
									</li>
								) : null}
								{reviewsCount > 0 ? (
									<li>
										Reviews: <strong>{reviewsCount}</strong>
									</li>
								) : null}
							</ul>
							<p className="mt-2 text-muted-foreground">These associated records will also be removed.</p>
						</div>
					) : null}
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={pending}
							onClick={() => {
								startTransition(async () => {
									setError(null);
									const response = await fetch(`/api/admin/experiences/${experienceId}`, { method: "DELETE" });
									if (!response.ok) {
										const data = await response.json().catch(() => ({ message: "Unable to delete experience" }));
										setError(data.message ?? "Unable to delete experience");
										return;
									}
									setConfirmOpen(false);
									router.refresh();
								});
							}}
						>
							Delete experience
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
