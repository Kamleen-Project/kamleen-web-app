"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo, useState } from "react";

import { useNotifications } from "@/components/providers/notification-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { cn } from "@/lib/utils";

function normalizeHref(href?: string | null) {
	if (!href) return href ?? null;
	return href.replace("/dashboard/organizer/organizer/", "/dashboard/organizer/");
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
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<CtaIconButton color="whiteBorder" size="md" ariaLabel="Notifications" badgeCount={unreadCount}>
					<Bell className="size-5" />
				</CtaIconButton>
			</PopoverTrigger>
			<PopoverContent className="w-96 p-0" align="end">
				<div className="max-h-[28rem] overflow-auto">
					<div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Notifications</div>
					{items.length === 0 ? (
						<div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
					) : (
						<ul className="divide-y divide-border/60">
							{items.map((n) => (
								<li key={n.id} className={cn("px-4 py-3", !n.readAt && "bg-accent/30")}>
									<div className="flex items-start gap-3">
										{/* Left dot indicator for unread */}
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
										{n.href ? (
											<Link href={normalizeHref(n.href) ?? "#"} className="text-xs text-primary underline underline-offset-2" onClick={() => setOpen(false)}>
												Open
											</Link>
										) : null}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
