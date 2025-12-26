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
	title: {
		default: "Kamleen",
		template: "%s | Kamleen",
	},
	description: "Activities and experiences reservation platform - Discover and book amazing local experiences.",
	metadataBase: new URL("https://kamleen.com"),
	keywords: [
		"activities",
		"experiences",
		"reservation",
		"booking",
		"events",
		"kamleen",
		"travel",
		"local guides",
		"tours",
		"workshops",
		"classes",
		"tangier",
		"rabat",
		"marrakech",
		"casablanca",
		"fez",
		"morocco",
		"adventure",
		"culture",
		"things to do",
	],
	authors: [
		{
			name: "Kamleen Team",
			url: "https://kamleen.com",
		},
	],
	creator: "Kamleen",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://kamleen.com",
		title: "Kamleen - Activities and experiences reservation platform",
		description: "Discover and book unique activities and experiences with Kamleen. The best platform for finding your next adventure.",
		siteName: "Kamleen",
		images: [
			{
				url: "/images/meta-cover.png",
				width: 1200,
				height: 630,
				alt: "Kamleen Platform Preview",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Kamleen - Activities and experiences reservation platform",
		description: "Discover and book unique activities and experiences with Kamleen.",
		images: ["/images/meta-cover.png"],
	},
	icons: {
		icon: "/images/favicon.png",
		apple: "/images/favicon.png",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await getServerAuthSession();

	return (
		<html lang="en" suppressHydrationWarning>
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
