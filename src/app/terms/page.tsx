import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
	title: "Terms of Service",
	description: "Review the terms and conditions for using Kamleen's platform and services.",
};

const sections = [
	{
		title: "1. Acceptance of Terms",
		body: `By accessing or using Kamleen, you agree to comply with these Terms of Service and any applicable policies referenced here. If you do not agree, you may not use the platform.`,
	},
	{
		title: "2. Eligibility",
		body: `Users must be at least 18 years old and capable of entering into legally binding agreements. Organizers warrant that their experiences adhere to all local regulations and safety standards.`,
	},
	{
		title: "3. Booking and Payments",
		body: `Bookings are confirmed once payment is received. Hosts agree to honor confirmed bookings and guests agree to respect cancellation timelines. Payment processing is handled through our secure providers.`,
	},
	{
		title: "4. Cancellations and Refunds",
		body: `Cancellation policies vary by experience. Refunds follow the specific terms presented at checkout. Kamleen reserves the right to issue partial refunds when extraordinary circumstances apply.`,
	},
	{
		title: "5. Conduct and Safety",
		body: `Guests and hosts agree to behave respectfully and responsibly. Kamleen may suspend or remove accounts that violate community guidelines, pose safety risks, or engage in fraudulent activity.`,
	},
	{
		title: "6. Intellectual Property",
		body: `All content on Kamleen, including branding, copy, and media, is protected by intellectual property laws. Users may not copy or reuse assets without prior written consent.`,
	},
	{
		title: "7. Liability",
		body: `Kamleen acts as a marketplace that connects travelers and hosts. Except where prohibited by law, Kamleen is not liable for direct or indirect damages arising from experiences or user conduct.`,
	},
	{
		title: "8. Changes to Terms",
		body: `We may update these Terms periodically. Continued use of the platform following changes constitutes acceptance of the revised Terms.`,
	},
	{
		title: "9. Contact",
		body: `For questions about these Terms, contact our team at legal@kamleen.com.`,
	},
];

export default function TermsPage() {
	return (
		<ContentPage
			caption="Terms"
			title="Terms of Service"
			subtitle="Please review the terms that govern your use of Kamleen's experiences and hosting platform."
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
