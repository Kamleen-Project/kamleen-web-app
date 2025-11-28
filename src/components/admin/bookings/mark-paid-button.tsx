"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { CtaButton } from "@/components/ui/cta-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

export function MarkPaidButton({ bookingId }: { bookingId: string }) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleMarkPaid() {
		setLoading(true);
		try {
			const res = await fetch(`/api/admin/bookings/${bookingId}/mark-paid`, { method: "POST" });
			if (!res.ok) throw new Error();
			router.refresh();
		} catch {
			alert("Failed to mark as paid");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<CtaButton size="sm" color="black" startIcon={<Check className="size-3" />} label="Mark Paid" />
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Confirm mark as paid</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">Are you sure you want to mark this booking as PAID? This will confirm the booking and send tickets.</p>
				<DialogFooter className="gap-2 justify-end">
					<DialogClose asChild>
						<CtaButton color="whiteBorder" size="md" label="Cancel" />
					</DialogClose>
					<CtaButton size="md" color="black" label="Confirm" onClick={handleMarkPaid} isLoading={loading} startIcon={<Check />} />
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
