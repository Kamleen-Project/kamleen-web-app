"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo, useState } from "react";

import { useNotifications } from "@/components/providers/notification-provider";
import { DropdownPanel, DropdownPanelHeader, DropdownPanelContent } from "@/components/ui/dropdown-panel";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { cn } from "@/lib/utils";

function normalizeHref(href?: string | null) {
	if (!href) return href ?? null;
	// Fix accidental double segment
	let out = href.replace("/dashboard/organizer/organizer/", "/dashboard/organizer/");
	// Back-compat: collapse older role-switch links into direct destination
	try {
		if (out.startsWith("/switch-role")) {
			const url = new URL(out, typeof window !== "undefined" ? window.location.origin : "https://kamleen.com");
			const to = (url.searchParams.get("to") || "").toLowerCase();
			const redirect = url.searchParams.get("redirect") || "/dashboard";
			if (to === "organizer") {
				out = redirect || "/dashboard/organizer";
			}
		}
	} catch {}
	return out;
}

export function NotificationsBell() {
	const { notifications, unreadCount, markRead } = useNotifications();
	const [open, setOpen] = useState(false);

	const items = notifications.slice(0, 10);
	const unreadIds = useMemo(() => items.filter((n) => !n.readAt).map((n) => n.id), [items]);

	const handleOpenChange = useCallback(
		async (next: boolean) => {
			setOpen(next);
			if (next && unreadIds.length) {
				await markRead(unreadIds);
			}
		},
		[unreadIds, markRead]
	);

	return (
		<DropdownPanel
			open={open}
			onOpenChange={handleOpenChange}
			align="end"
			className="w-96 p-0"
			trigger={
				<CtaIconButton color="whiteBorder" size="md" ariaLabel="Notifications" badgeCount={unreadCount}>
					<Bell className="size-5" />
				</CtaIconButton>
			}
		>
			<DropdownPanelHeader title={<span className="text-sm font-semibold">Notifications</span>} />
			<DropdownPanelContent className="p-0">
				<div className="max-h-[28rem] overflow-auto">
					{items.length === 0 ? (
						<div className="flex min-h-[240px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
					) : (
						// <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
						<ul className="divide-y divide-border/60">
							{items.map((n) => (
								<li key={n.id} className={cn("px-4 py-3", !n.readAt && "bg-accent/30")}>
									<div className="flex items-start gap-3">
										<span
											className={cn(
												"mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full",
												!n.readAt ? "bg-red-500" : "bg-transparent border border-transparent"
											)}
											aria-hidden="true"
										/>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium">{n.title}</div>
											<div className="truncate text-sm text-muted-foreground">{n.message}</div>
											<div className="truncate text-xs text-muted-foreground/80" title={new Date(n.createdAt).toLocaleString()}>
												{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
											</div>
										</div>
										{n.href
											? (() => {
													const overrideHref = n.title === "Organizer request approved" ? "/notifications/organizer-approved" : null;
													const itemHref = overrideHref ?? normalizeHref(n.href) ?? "#";
													return (
														<Link href={itemHref} className="text-xs text-primary underline underline-offset-2" onClick={() => setOpen(false)}>
															Open
														</Link>
													);
											  })()
											: null}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</DropdownPanelContent>
		</DropdownPanel>
	);
}
