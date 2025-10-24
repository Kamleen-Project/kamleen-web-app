"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BecomeOrganizerModal } from "@/components/organizer/become-organizer-modal";

export default function BecomeOrganizerPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === "loading") return;
		if (!session?.user) {
			router.replace("/login");
			return;
		}
	}, [status, session, router]);

	// Minimal container that opens the modal immediately
	return (
		<div className="p-8">
			<BecomeOrganizerModal autoOpen />
		</div>
	);
}
