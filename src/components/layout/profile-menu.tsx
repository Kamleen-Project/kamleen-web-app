"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
// Link removed; using reusable MenuItem components instead
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/auth-modal";
import { CtaButton } from "@/components/ui/cta-button";
import { BecomeOrganizerModal } from "@/components/organizer/become-organizer-modal";
import { DropdownPanel, DropdownPanelHeader, DropdownPanelContent, DropdownPanelFooter } from "@/components/ui/dropdown-panel";
import { MenuItem } from "@/components/ui/menu-item";

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
				<CtaButton
					color="white"
					size="md"
					className="text-sm font-medium"
					onClick={() => {
						setAuthMode("login");
						setAuthOpen(true);
					}}
				>
					Log in
				</CtaButton>
				<CtaButton
					color="black"
					size="md"
					className="text-sm font-medium"
					onClick={() => {
						setAuthMode("register");
						setAuthOpen(true);
					}}
				>
					Sign up
				</CtaButton>
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
	// Narrow to augmented user type from next-auth.d.ts
	const user = session.user as typeof session.user & {
		role: string;
		activeRole: string;
		organizerStatus: string;
	};
	const isAdmin = user.role === "ADMIN";
	const isOrganizer = user.activeRole === "ORGANIZER";
	const isExplorer = user.activeRole === "EXPLORER";
	const isOrganizerApproved = user.organizerStatus === "APPROVED";
	const showBecomeOrganizer = !isOrganizerApproved && isExplorer && !isAdmin;
	const avatarSrc = session.user.image && !avatarError ? session.user.image : null;
	const consoleHref = isOrganizer ? "/dashboard/organizer" : user.activeRole === "EXPLORER" ? "/dashboard/explorer" : "/dashboard";
	const profileHref = isAdmin ? "/admin/profile" : isOrganizer ? "/dashboard/organizer/profile" : "/dashboard/explorer/profile";
	const consoleLabel = isOrganizer ? "Organizer console" : user.activeRole === "EXPLORER" ? "Explorer console" : "Your console";

	return (
		<div className="relative" ref={menuRef}>
			<DropdownPanel
				open={open}
				onOpenChange={(next) => {
					if (!next && typeof document !== "undefined" && document.body.classList.contains("modal-open")) {
						return;
					}
					setOpen(next);
				}}
				align="end"
				trigger={
					<button
						type="button"
						className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-background focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
						aria-expanded={open}
						aria-haspopup="menu"
						aria-controls={menuId}
					>
						<span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
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
					</button>
				}
			>
				<DropdownPanelHeader
					className="bg-muted/40"
					title={<span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Signed in as</span>}
					right={
						<Badge variant="soft" className="text-[11px]">
							{roleLabels[user.activeRole] ?? user.activeRole}
						</Badge>
					}
				>
					<div className="space-y-0.5">
						{session.user.name ? <p className="font-semibold text-foreground">{session.user.name}</p> : null}
						<p className="text-sm text-muted-foreground">{session.user.email}</p>
					</div>
				</DropdownPanelHeader>
				<DropdownPanelContent className="flex flex-col gap-1">
					<MenuItem href={profileHref}>View profile</MenuItem>
					<MenuItem href="/dashboard">Go to dashboard</MenuItem>
					{!(isAdmin && consoleLabel === "Your console") ? <MenuItem href={consoleHref}>{consoleLabel}</MenuItem> : null}
					{showBecomeOrganizer ? (
						<BecomeOrganizerModal
							trigger={
								<MenuItem variant="cta" className="justify-start">
									Become an organizer
								</MenuItem>
							}
						/>
					) : null}
					{isOrganizer ? <MenuItem href="/dashboard/organizer/bookings">Manage bookings</MenuItem> : null}
					{isAdmin ? <MenuItem href="/admin">Admin console</MenuItem> : null}
				</DropdownPanelContent>
				<DropdownPanelFooter>
					<MenuItem variant="danger" onClick={() => signOut({ callbackUrl: "/" })}>
						Log out
					</MenuItem>
				</DropdownPanelFooter>
			</DropdownPanel>
		</div>
	);
}
