"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";

export function SiteFooterConditional() {
	const pathname = usePathname();
	const hideFooter = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

	if (hideFooter) return null;

	return <SiteFooter />;
}
