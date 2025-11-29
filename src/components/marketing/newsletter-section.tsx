"use client";

import { useCallback, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";

import { Container } from "@/components/layout/container";
import { CtaButton } from "@/components/ui/cta-button";
import { InputField } from "@/components/ui/input-field";
import { useNotifications } from "@/components/providers/notification-provider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { subscribeToNewsletter } from "@/lib/newsletter";

export function NewsletterSection() {
	const { notify } = useNotifications();
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const trimmed = email.trim().toLowerCase();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
				notify({ intent: "warning", message: "Please enter a valid email address." });
				return;
			}
			setSubmitting(true);
			try {
				const result = await subscribeToNewsletter(trimmed);
				if (result.success) {
					notify({ intent: "success", title: "Subscribed", message: result.message });
					setEmail("");
				} else {
					notify({ intent: "error", title: "Error", message: result.message });
				}
			} catch (error) {
				notify({ intent: "error", title: "Error", message: "Something went wrong. Please try again." });
			} finally {
				setSubmitting(false);
			}
		},
		[email, notify]
	);

	return (
		<section className={"relative isolate"}>
			<div className={"pointer-events-none absolute inset-x-0 top-0 z-[-3] h-[240px] bg-gradient-to-b from-primary/10 via-primary/0 to-transparent blur-3xl"} />
			<div
				style={{
					backgroundImage: "radial-gradient(ellipse at 30% 20%, #ff512f 0%, #dd2476 100%)",
				}}
				className="z-[-2]"
			>
				<Container className={"p-0 sm:p-0"}>
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 z-[0] text-primary opacity-25"
						style={{
							WebkitMaskImage: "url('/images/pattern-svg.svg')",
							maskImage: "url('/images/pattern-svg.svg')",
							WebkitMaskRepeat: "no-repeat",
							maskRepeat: "no-repeat",
							WebkitMaskSize: "cover",
							maskSize: "cover",
							WebkitMaskPosition: "center",
							maskPosition: "center",
							backgroundColor: "#ffffff",
						}}
					/>
					<div className={"flex flex-col items-start gap-6 sm:flex-row sm:items-center relative z-[1]"}>
						<Image src="/images/leen-mail.png" alt="" height={320} width={320} className="h-full" aria-hidden />
						<div className={"flex flex-col items-start gap-8 py-14 sm:py-16"}>
							<div className={"space-y-2"}>
								<h2 className={"text-3xl font-semibold tracking-tight text-white"}>Join our adventurous community!</h2>
								<p className={"max-w-2xl text-md text-white/70"}>
									Get stories from our hosts and explorers, plus fresh experiences and offers. Unsubscribe anytime.
								</p>
							</div>
							<form onSubmit={handleSubmit} className={"w-full max-w-md shrink-0 sm:w-auto"}>
								<div className={"flex flex-row items-right gap-2 items-center"}>
									<div className="relative w-xs">
										<Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										<InputField
											id="newsletter-email"
											type="email"
											name="email"
											autoComplete="email"
											required
											placeholder="Your email address"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											containerClassName="w-full"
											className="rounded-full pl-9"
										/>
									</div>
									<CtaButton type={"submit"} size={"lg"} color={"black"} isLoading={submitting} aria-label={"Subscribe"}>
										Subscribe
									</CtaButton>
								</div>
							</form>
						</div>
					</div>
				</Container>
			</div>
		</section>
	);
}
