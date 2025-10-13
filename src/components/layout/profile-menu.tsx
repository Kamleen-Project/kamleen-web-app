"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/auth-modal";

const roleLabels: Record<string, string> = {
	EXPLORER: "Explorer",
	ORGANIZER: "Organizer",
	ADMIN: "Admin",
};

export function ProfileMenu() {
	const { data: session, status } = useSession();
	const [open, setOpen] = useState(false);
	const [authOpen, setAuthOpen] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "register">("login");
	const [avatarError, setAvatarError] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		setAvatarError(false);
	}, [session?.user?.image]);

	useEffect(() => {
		if (!open) return;

		function handleClick(event: MouseEvent) {
			if (!menuRef.current) return;
			if (!menuRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		window.addEventListener("click", handleClick);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("click", handleClick);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	if (status === "loading") {
		return (
			<div className="flex items-center gap-3">
				<span className="h-10 w-24 animate-pulse rounded-full bg-muted" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					className="text-sm font-medium"
					onClick={() => {
						setAuthMode("login");
						setAuthOpen(true);
					}}
				>
					Log in
				</Button>
				<Button
					className="text-sm font-medium"
					onClick={() => {
						setAuthMode("register");
						setAuthOpen(true);
					}}
				>
					Sign up
				</Button>
				<AuthModal open={authOpen} mode={authMode} onOpenChange={setAuthOpen} onModeChange={setAuthMode} />
			</div>
		);
	}

	const initials =
		session.user.name
			?.split(" ")
			.map((part) => part.charAt(0))
			.join("")
			.slice(0, 2)
			.toUpperCase() || "TU";
	const menuId = "profile-menu-dropdown";
	const isAdmin = session.user.role === "ADMIN";
	const isOrganizer = session.user.activeRole === "ORGANIZER";
	const avatarSrc = session.user.image && !avatarError ? session.user.image : null;
	const consoleHref = isOrganizer ? "/dashboard/organizer" : session.user.activeRole === "EXPLORER" ? "/dashboard/explorer" : "/dashboard";
	const profileHref = isAdmin ? "/admin/profile" : isOrganizer ? "/dashboard/organizer/profile" : "/dashboard/explorer/profile";
	const consoleLabel = isOrganizer ? "Organizer console" : session.user.activeRole === "EXPLORER" ? "Explorer console" : "Your console";

	return (
		<div className="relative" ref={menuRef}>
			<Button
				type="button"
				variant="ghost"
				className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-background focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none border-none"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-controls={menuId}
			>
				<span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
					{avatarSrc ? (
						<Image
							src={avatarSrc}
							alt={session.user.name ?? session.user.email ?? "Profile photo"}
							fill
							sizes="32px"
							className="object-cover"
							onError={() => setAvatarError(true)}
						/>
					) : (
						initials
					)}
				</span>
				<span>{session.user.name ?? "Account"}</span>
			</Button>
			{open ? (
				<div
					id={menuId}
					role="menu"
					className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-border/60 bg-popover text-left text-sm shadow-xl"
				>
					<div className="space-y-2 bg-muted/40 p-4">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
						<div className="flex flex-col">
							<p className="font-semibold text-foreground">{session.user.email}</p>
							<Badge variant="soft" className="mt-1 w-fit text-[11px]">
								{roleLabels[session.user.activeRole] ?? session.user.activeRole}
							</Badge>
						</div>
					</div>
					<div className="flex flex-col gap-1 px-4 py-3">
						<Link href={profileHref} role="menuitem" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
							View profile
						</Link>
						<Link href="/dashboard" role="menuitem" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
							Go to dashboard
						</Link>
						{!(isAdmin && consoleLabel === "Your console") ? (
							<Link href={consoleHref} role="menuitem" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
								{consoleLabel}
							</Link>
						) : null}
						{isOrganizer ? (
							<Link
								href="/dashboard/organizer/bookings"
								role="menuitem"
								className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
							>
								Manage bookings
							</Link>
						) : null}
						{isAdmin ? (
							<Link href="/admin" role="menuitem" className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
								Admin console
							</Link>
						) : null}
					</div>
					<div className="border-t border-border/60 px-4 py-3">
						<button
							type="button"
							role="menuitem"
							className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
							onClick={() => signOut({ callbackUrl: "/" })}
						>
							Log out
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
