"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SwitchRolePage() {
	const router = useRouter();
	const params = useSearchParams();
	const { update } = useSession();

	useEffect(() => {
		const to = (params.get("to") || "").toUpperCase();
		const redirect = params.get("redirect") || "/dashboard";

		async function switchRole() {
			if (to !== "EXPLORER" && to !== "ORGANIZER") {
				router.replace("/dashboard");
				return;
			}
			try {
				const res = await fetch("/api/me/active-role", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ activeRole: to }),
				});
				if (res.ok) {
					await update?.({ activeRole: to });
					// Small delay to ensure the server-side session layer catches up before landing on a protected route
					setTimeout(() => router.replace(redirect), 50);
				} else {
					router.replace("/dashboard");
				}
			} catch {
				router.replace("/dashboard");
			}
		}

		switchRole();
	}, [params, router, update]);

	return null;
}
