"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import BalloonLoading from "@/components/ui/balloon-loading";

export default function OrganizerApprovedOpenPage() {
	const router = useRouter();
	const { update } = useSession();

	useEffect(() => {
		let cancelled = false;
		async function run() {
			try {
				await fetch("/api/me/active-role", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ activeRole: "ORGANIZER" }),
					cache: "no-store",
				}).catch(() => {});
			} finally {
				try {
					await update({
						role: "ORGANIZER",
						activeRole: "ORGANIZER",
						organizerStatus: "APPROVED",
						user: { role: "ORGANIZER", activeRole: "ORGANIZER", organizerStatus: "APPROVED" },
					} as unknown as Record<string, unknown>);
				} catch {}
				if (!cancelled) {
					setTimeout(() => {
						router.replace("/dashboard/organizer");
						router.refresh();
					}, 50);
				}
			}
		}
		run();
		return () => {
			cancelled = true;
		};
	}, [router, update]);

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-8">
			<div className="text-center">
				<BalloonLoading sizeClassName="w-20" label="Switching you to organizer" />
				<p className="mt-3 text-sm text-muted-foreground">Preparing your organizer console…</p>
			</div>
		</div>
	);
}
