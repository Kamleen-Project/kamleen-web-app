"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useNotifications } from "@/components/providers/notification-provider";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";

type SwitchableRole = "EXPLORER" | "ORGANIZER";

const ROLE_COPY: Record<SwitchableRole, { label: string; success: string }> = {
	EXPLORER: { label: "Switch to Exploring", success: "You are now browsing as an Explorer." },
	ORGANIZER: { label: "Switch to Organizing", success: "Organizer tools are now active." },
};

export function RoleSwitcher({ className }: { className?: string }) {
	const router = useRouter();
	const { data: session, status, update } = useSession();
	const { notify } = useNotifications();
	const [pendingRole, setPendingRole] = useState<SwitchableRole | null>(null);

	if (status === "loading") {
		return <div className={cn("hidden h-9 w-48 animate-pulse rounded-md bg-muted/60 sm:block", className)} />;
	}

	if (!session?.user) {
		return null;
	}

	const activeRole: SwitchableRole = session.user.activeRole === "ORGANIZER" ? "ORGANIZER" : "EXPLORER";
	const organizerStatus = session.user.organizerStatus;
	const canUseOrganizer = organizerStatus === "APPROVED";

	const handleSwitch = async (nextRole: SwitchableRole) => {
		if (nextRole === activeRole) {
			return;
		}

		if (nextRole === "ORGANIZER" && !canUseOrganizer) {
			notify({ intent: "warning", message: "Your organizer application is still pending." });
			return;
		}

		setPendingRole(nextRole);

		try {
			const response = await fetch("/api/me/active-role", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ activeRole: nextRole }),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { message?: string } | null;
				notify({ intent: "error", message: payload?.message ?? "Unable to switch roles right now." });
				return;
			}

			if (typeof update === "function") {
				await update({ activeRole: nextRole });
			}

			notify({ intent: "success", message: ROLE_COPY[nextRole].success });
			const redirectTarget = nextRole === "ORGANIZER" ? "/dashboard/organizer" : "/dashboard/explorer";
			setTimeout(() => {
				router.replace(redirectTarget);
			}, 50);
		} catch (error) {
			notify({ intent: "error", message: error instanceof Error ? error.message : "Unable to switch roles." });
		} finally {
			setPendingRole(null);
		}
	};

	const targetRole: SwitchableRole = activeRole === "ORGANIZER" ? "EXPLORER" : "ORGANIZER";
	const targetCopy = ROLE_COPY[targetRole];
	const isBusy = pendingRole !== null;
	const isSwitching = pendingRole === targetRole;

	return (
		<CtaButton
			type="button"
			size="sm"
			color="white"
			className={cn("min-w-[10.5rem]", className)}
			disabled={isBusy}
			onClick={() => handleSwitch(targetRole)}
			isLoading={isSwitching}
			title={targetRole === "ORGANIZER" && !canUseOrganizer ? "Organizer access is pending approval" : undefined}
		>
			{targetCopy.label}
		</CtaButton>
	);
}
