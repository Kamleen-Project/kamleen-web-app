import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Globe2, Instagram } from "lucide-react";

import { TogetherLogo } from "@/components/branding";
import { Container } from "@/components/layout/container";
import { CtaButton } from "@/components/ui/cta-button";

const companyLinks = [
	{ label: "About", href: "/#why" },
	{ label: "Our story", href: "/#stories" },
	{ label: "Community", href: "/#hosts" },
	{ label: "FAQ", href: "/faq" },
	{ label: "Careers", href: "mailto:join@kamleen.com" },
];

const socialLinks: { label: string; href: string; icon: LucideIcon }[] = [
	// { label: "LinkedIn", href: "https://www.linkedin.com/company/kamleen", icon: Linkedin },
	{ label: "Instagram", href: "https://www.instagram.com/kamleencom", icon: Instagram },
	// { label: "Facebook", href: "https://www.facebook.com/kamleen", icon: Facebook },
	// { label: "YouTube", href: "https://www.youtube.com/@kamleen", icon: Youtube },
];

const bottomLinks = [
	{ label: "Terms", href: "/terms" },
	{ label: "Privacy", href: "/privacy" },
	{ label: "Cookies", href: "/cookies" },
];

export function SiteFooter() {
	return (
		<footer className="bg-black text-white">
			<Container className="flex flex-col gap-12 py-16 lg:gap-16 lg:py-20">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="max-w-xl space-y-4">
						<TogetherLogo title="Kamleen" variant="dark" size="lg" />
						<p className="text-sm text-white/70">
							Experiences that connect curious explorers with inspiring hosts.
						</p>
					</div>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 lg:flex-col lg:items-end">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:text-white"
						>
							<Globe2 className="size-4" aria-hidden />
							English
						</button>
						<div className="flex items-center gap-2">
							{socialLinks.map(({ label, href, icon: Icon }) => (
								<a
									key={label}
									href={href}
									target="_blank"
									rel="noreferrer"
									aria-label={label}
									className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:border-white/30 hover:text-white"
								>
									<Icon className="size-4" aria-hidden />
								</a>
							))}
						</div>
					</div>
				</div>

				{/* <div className="grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-4">
						<h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Company</h3>
						<ul className="space-y-3 text-sm text-white/80">
							{companyLinks.map(({ label, href }) => (
								<li key={label}>
									<Link href={href} className="transition hover:text-white" prefetch={false}>
										{label}
									</Link>
								</li>
							))}
						</ul>
					</div>
					<div className="space-y-4">
						<h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Support</h3>
						<ul className="space-y-3 text-sm text-white/80">
							<li>
								<Link href="/onboarding" className="transition hover:text-white" prefetch={false}>
									Become a host
								</Link>
							</li>
							<li>
								<Link href="/admin/login" className="transition hover:text-white" prefetch={false}>
									Organizer portal
								</Link>
							</li>
							<li>
								<a href="mailto:support@kamleen.com" className="transition hover:text-white">
									Support center
								</a>
							</li>
							<li>
								<a href="mailto:press@kamleen.com" className="transition hover:text-white">
									Press inquiries
								</a>
							</li>
						</ul>
					</div>
					<div className="space-y-4">
						<h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Newsletter</h3>
						<p className="text-sm text-white/70">Get stories from our hosts and explorers delivered monthly.</p>
						<form className="flex flex-col gap-3">
							<label htmlFor="footer-newsletter" className="sr-only">
								Email address
							</label>
							<input
								type="email"
								id="footer-newsletter"
								name="email"
								required
								placeholder="you@example.com"
								className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
							/>
							<CtaButton type="submit" color="white" size="md" className="shrink-0">
								Subscribe
							</CtaButton>
						</form>
					</div>
				</div> */}

				<div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
					<p>© {new Date().getFullYear()} Kamleen. All rights reserved.</p>
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
						{bottomLinks.map(({ label, href }) => (
							<Link key={label} href={href} className="transition hover:text-white" prefetch={false}>
								{label}
							</Link>
						))}
					</div>
				</div>
			</Container>
		</footer>
	);
}
