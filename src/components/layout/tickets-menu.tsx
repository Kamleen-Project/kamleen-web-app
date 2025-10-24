"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ticket as TicketIcon } from "lucide-react";

import { DropdownPanel, DropdownPanelHeader, DropdownPanelContent } from "@/components/ui/dropdown-panel";
import CtaIconButton from "@/components/ui/cta-icon-button";
import BalloonLoading from "@/components/ui/balloon-loading";

type TicketItem = {
	id: string;
	code: string;
	seatNumber: number;
	status: string;
	createdAt: string;
	booking: {
		id: string;
		status: string;
		session: { startAt: string };
		experience: { id: string; title: string; slug: string };
	};
};

export function TicketsMenu() {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [tickets, setTickets] = useState<TicketItem[]>([]);
	const [activeCount, setActiveCount] = useState<number>(0);

	const fetchTickets = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/me/tickets", { cache: "no-store" });
			if (!res.ok) return;
			const data = (await res.json()) as { tickets: TicketItem[] };
			setTickets(data.tickets);
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchCount = useCallback(async () => {
		try {
			const res = await fetch("/api/me/tickets/count", { cache: "no-store" });
			if (!res.ok) return;
			const data = (await res.json()) as { count: number };
			setActiveCount(data.count || 0);
		} catch {}
	}, []);

	useEffect(() => {
		if (open) {
			void fetchTickets();
			void fetchCount();
		}
	}, [open, fetchTickets]);

	const items = useMemo(() => tickets.slice(0, 10), [tickets]);

	useEffect(() => {
		// Fetch count initially to show badge without opening
		void fetchCount();
	}, [fetchCount]);

	return (
		<DropdownPanel
			open={open}
			onOpenChange={setOpen}
			align="end"
			className="w-96 p-0"
			trigger={
				<CtaIconButton color="whiteBorder" size="md" ariaLabel="Tickets" badgeCount={activeCount} badgeClassName="bg-emerald-600">
					<TicketIcon className="size-5" />
				</CtaIconButton>
			}
		>
			<DropdownPanelHeader title={<span className="text-sm font-semibold">Your tickets</span>} />
			<DropdownPanelContent className="p-0">
				<div className="max-h-96 min-h-[240px] overflow-auto p-2">
					{loading ? (
						<div className="flex min-h-[240px] items-center justify-center py-8">
							<BalloonLoading size="sm" color="gray" label="Loading tickets" />
						</div>
					) : items.length === 0 ? (
						<div className="flex min-h-[240px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">No tickets yet</div>
					) : (
						<ul className="divide-y divide-border/60">
							{items.map((t) => (
								<li key={t.id} className="p-3 text-sm">
									<div className="flex items-start justify-between gap-2">
										<div>
											<div className="font-medium">{t.booking.experience.title}</div>
											<div className="text-xs text-muted-foreground">{new Date(t.booking.session.startAt).toLocaleString()}</div>
											<div className="text-xs text-muted-foreground">
												Ticket {t.code} · Seat {t.seatNumber}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Link
												href={`/api/me/tickets/${t.id}/download`}
												className="rounded border border-border/60 px-2 py-1 text-xs hover:bg-accent/40"
												prefetch={false}
											>
												PDF
											</Link>
											<Link href={`/experiences/${t.booking.experience.slug}`} className="rounded border border-border/60 px-2 py-1 text-xs hover:bg-accent/40">
												View
											</Link>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
					<div className="px-2 py-2 text-xs text-muted-foreground">Showing latest {items.length} tickets</div>
				</div>
			</DropdownPanelContent>
		</DropdownPanel>
	);
}
