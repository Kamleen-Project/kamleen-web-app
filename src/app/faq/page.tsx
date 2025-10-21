import type { Metadata } from "next";

import { ContentPage } from "@/components/layout/content-page";
import { defaultFaqs } from "@/data/faqs";

export const metadata: Metadata = {
	title: "Frequently Asked Questions",
	description: "Find answers to the most common questions about Kamleen experiences and hosting.",
};

export default function FaqPage() {
	return (
		<ContentPage
			caption="FAQ"
			title="Answers before you pack your bags"
			subtitle="Can’t find what you’re looking for? Message us anytime—we’re travelers too."
		>
			<dl className="space-y-8">
				{defaultFaqs.map(({ question, answer }) => (
					<div key={question} className="space-y-2">
						<dt className="text-lg font-semibold text-foreground">{question}</dt>
						<dd className="text-muted-foreground">{answer}</dd>
					</div>
				))}
			</dl>
		</ContentPage>
	);
}
