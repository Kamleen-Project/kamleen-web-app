export interface FaqItem {
	question: string;
	answer: string;
}

export const defaultFaqs: FaqItem[] = [
	{
		question: "How do I book an experience?",
		answer:
			"Choose your date, confirm group size, and reserve instantly. Your host will reach out within 24 hours with final details.",
	},
	{
		question: "Can I host my own experience?",
		answer:
			"We look for thoughtful storytellers with a unique perspective. Apply to host and our curation team will guide you through the process.",
	},
	{
		question: "What is your cancellation policy?",
		answer:
			"Plans change—we get it. Enjoy free cancellations up to 72 hours before your experience begins, unless noted otherwise.",
	},
];
