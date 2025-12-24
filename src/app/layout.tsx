import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

// test
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooterConditional } from "@/components/layout/site-footer-conditional";
import { AuthProvider } from "@/components/providers/session-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { PostHogContextProvider } from "@/components/providers/posthog-provider";
import { getServerAuthSession } from "@/lib/auth";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Kamleen",
	description: "Activities and experiences reservation platform",
	metadataBase: new URL("https://kamleen.com"),
	icons: {
		icon: "/images/favicon.png",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await getServerAuthSession();

	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<AuthProvider session={session}>
					<PostHogContextProvider>
						<NotificationProvider>
							<div className="flex min-h-screen flex-col bg-background text-foreground">
								<SiteHeader session={session} />
								<main className="flex-1">{children}</main>
								<SiteFooterConditional />
							</div>
						</NotificationProvider>
					</PostHogContextProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
