import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description: "Learn how Kamleen collects, uses, and protects your personal information.",
};

const sections = [
	{
		title: "1. Information We Collect",
		body: `We collect personal information that you provide directly, such as contact details, booking preferences, and payment information. We also gather device data and usage analytics to improve our services.`,
	},
	{
		title: "2. How We Use Information",
		body: `Your information enables us to process bookings, provide customer support, personalize recommendations, and communicate updates. We only use your data in ways consistent with this policy.`,
	},
	{
		title: "3. Sharing and Disclosure",
		body: `We share personal data with hosts, payment providers, and trusted vendors solely to deliver the services you request. We never sell personal information to third parties.`,
	},
	{
		title: "4. Cookies and Tracking",
		body: `Cookies help us understand how visitors engage with Kamleen. You can control cookie preferences through your browser settings, but disabling them may limit certain features.`,
	},
	{
		title: "5. Data Security",
		body: `We implement administrative, technical, and physical safeguards to protect your information. Despite our efforts, no system is completely secure, so please use Kamleen responsibly.`,
	},
	{
		title: "6. Data Retention",
		body: `We retain personal information only as long as necessary to fulfill the purposes outlined here or comply with legal obligations.`,
	},
	{
		title: "7. Your Rights",
		body: `Depending on your location, you may request access, correction, deletion, or portability of your data. Contact us to exercise these rights and we will respond promptly.`,
	},
	{
		title: "8. International Transfers",
		body: `When we transfer personal information across borders, we rely on appropriate safeguards such as standard contractual clauses to protect your data.`,
	},
	{
		title: "9. Updates to this Policy",
		body: `We may update this Privacy Policy to reflect changes in law or our practices. We will notify you of significant updates and indicate the latest revision date.`,
	},
	{
		title: "10. Contact",
		body: `For privacy inquiries, email us at privacy@kamleen.com.`,
	},
];

export default function PrivacyPage() {
	return (
		<ContentPage
			caption="Privacy"
			title="Privacy Policy"
			subtitle="Transparency is important to us—here’s how we protect and handle your data."
		>
			<div className="space-y-8">
				{sections.map(({ title, body }) => (
					<section key={title} className="space-y-3">
						<h2 className="text-xl font-semibold text-foreground">{title}</h2>
						<p>{body}</p>
					</section>
				))}
			</div>
		</ContentPage>
	);
}
