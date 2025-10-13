"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Toast = {
	id: string;
	title?: string;
	message: string;
	intent?: "default" | "success" | "warning" | "error";
};

type NotificationItem = {
	id: string;
	title: string;
	message: string;
	priority: "LOW" | "NORMAL" | "HIGH";
	eventType: string;
	channels: string[];
	href?: string | null;
	createdAt: string;
	readAt?: string | null;
};

type ContextValue = {
	toasts: Toast[];
	notify: (toast: Omit<Toast, "id">) => void;
	remove: (id: string) => void;
	unreadCount: number;
	notifications: NotificationItem[];
	markRead: (ids: string[]) => Promise<void>;
};

const NotificationContext = createContext<ContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);

	const remove = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const notify = useCallback(
		(toast: Omit<Toast, "id">) => {
			const id = crypto.randomUUID();
			setToasts((prev) => [...prev, { id, ...toast }]);
			setTimeout(() => remove(id), 4000);
		},
		[remove]
	);

	const markRead = useCallback(async (ids: string[]) => {
		if (!ids.length) return;
		try {
			const res = await fetch("/api/notifications", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ ids }),
			});
			if (!res.ok) return;
		} catch {}
	}, []);

	// SSE subscription
	useEffect(() => {
		let es: EventSource | null = null;
		const connect = () => {
			es = new EventSource("/api/notifications/stream");
			es.onmessage = (ev) => {
				try {
					const payload = JSON.parse(ev.data);
					if (payload.type === "snapshot") {
						setNotifications(payload.items);
						setUnreadCount(payload.unreadCount);
					} else if (payload.type === "notification") {
						const item = payload.data as NotificationItem;
						setNotifications((prev) => [item, ...prev].slice(0, 20));
						if ((item.channels || []).includes("TOAST")) {
							notify({ title: item.title, message: item.message });
						}
						setUnreadCount((c) => c + 1);
					} else if (payload.type === "read") {
						const ids: string[] = payload.data?.ids || [];
						setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n)));
						setUnreadCount((c) => Math.max(0, c - ids.length));
					}
				} catch {}
			};
			es.onerror = () => {
				es?.close();
				setTimeout(connect, 2000);
			};
		};
		connect();
		return () => es?.close();
	}, [notify]);

	const value = useMemo<ContextValue>(
		() => ({ toasts, notify, remove, unreadCount, notifications, markRead }),
		[toasts, notify, remove, unreadCount, notifications, markRead]
	);

	return (
		<NotificationContext.Provider value={value}>
			{children}
			<ToastViewport toasts={toasts} onDismiss={remove} />
		</NotificationContext.Provider>
	);
}

export function useNotifications() {
	const ctx = useContext(NotificationContext);
	if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
	return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
	return (
		<div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-80 flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={cn(
						"pointer-events-auto rounded-md border border-border/60 bg-background/95 p-3 shadow-md backdrop-blur",
						"animate-in fade-in slide-in-from-top-2"
					)}
					role="status"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							{t.title ? <div className="truncate text-sm font-medium">{t.title}</div> : null}
							<div className="truncate text-sm text-muted-foreground">{t.message}</div>
						</div>
						<button
							type="button"
							className="text-muted-foreground/80 transition hover:text-foreground"
							onClick={() => onDismiss(t.id)}
							aria-label="Dismiss notification"
						>
							×
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
