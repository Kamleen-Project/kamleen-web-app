import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { OnboardingProfileForm } from "@/components/auth/onboarding-profile-form";
import { sanitizeRelativePath } from "@/lib/sanitize-relative-path";

export default async function OnboardingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
	const session = await getServerAuthSession();
	if (!session?.user) {
		redirect("/login");
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { emailVerified: true, name: true, email: true, birthDate: true, termsAcceptedAt: true, onboardingCompletedAt: true },
	});
	if (!user) redirect("/login");

	const emailConfirmed = !!user.emailVerified;
	const profileDone = !!user.birthDate && !!user.termsAcceptedAt && !!(session.user.name || user.name);
	const onboardingCompleted = !!user.onboardingCompletedAt;
	if (onboardingCompleted) {
		redirect("/dashboard");
	}

	// Optional welcome screen on initial arrival from signup
	const resolvedSearchParams = (searchParams ? await searchParams : undefined) as Record<string, string | string[] | undefined> | undefined;
	const startParam = resolvedSearchParams?.start ?? "";
	const startValue = Array.isArray(startParam) ? startParam[0] : startParam;
	const showWelcome = typeof startValue === "string" && startValue.toLowerCase() === "welcome";
	const rawNextParam = resolvedSearchParams?.next ?? "";
	const nextValue = Array.isArray(rawNextParam) ? rawNextParam[0] : rawNextParam;
	const safeNext = typeof nextValue === "string" ? sanitizeRelativePath(nextValue) : null;
	const onboardingContinueHref = safeNext ? `/onboarding?next=${encodeURIComponent(safeNext)}` : "/onboarding";

	if (showWelcome) {
		return (
			<div
				className="relative flex items-center justify-center py-16 bg-background overflow-x-hidden overflow-y-auto"
				style={{ ["--welcome-pattern-color" as unknown as string]: "#000000", height: "calc(100vh - 64px)" }}
			>
				{/* decorative background pattern */}
				<div
					className="pointer-events-none absolute w-full h-full"
					style={{
						WebkitMaskImage: "url('/images/pattern-svg.svg')",
						maskImage: "url('/images/pattern-svg.svg')",
						WebkitMaskRepeat: "repeat",
						maskRepeat: "repeat",
						WebkitMaskSize: "100%",
						maskSize: "100%",
						backgroundColor: "var(--welcome-pattern-color, #ffffff)",
						opacity: 0.18,
					}}
				/>
				<div className="absolute h-full w-1/2 right-6">
					<Image src="/images/LeenInWebsite.png" alt="Welcome illustration" fill priority className="pt-12 object-contain object-center" sizes="100%" />
				</div>
				<div className="relative z-10 w-full max-w-6xl mx-6 h-full">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center h-full">
						<div className="text-left">
							<h1 className="text-5xl font-bold tracking-tight">Welcome to Kamleen</h1>
							<p className="mt-5 text-lg text-muted-foreground">
								Thanks for creating your account. <br /> We’ll walk you through a quick setup.
							</p>
							<div className="mt-8 flex items-center justify-start">
								<CtaButton asChild color="primary" size="lg">
									<Link href={onboardingContinueHref}>Get started</Link>
								</CtaButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Wizard-like header and progress aligned with experience wizard approach
	const steps = [
		{ title: "Confirm email", description: "Verify your email address." },
		{ title: "Set up account", description: "Provide basics and accept terms." },
		{ title: "Complete profile", description: "Add more details to personalize your profile." },
	] as const;
	const currentStepIndex = !emailConfirmed ? 0 : !profileDone ? 1 : 2;
	const progressSteps = steps.map((step, index) => ({
		...step,
		status: index < currentStepIndex ? "complete" : index === currentStepIndex ? "current" : "upcoming",
		index,
	}));
	const hasCustomNext = !!safeNext;
	const skipNextPath = safeNext ?? "/";
	const finishNextPath = safeNext ?? "/dashboard/explorer/profile";
	const skipLinkLabel = hasCustomNext ? "Skip and return to your experience" : "Skip and go home";
	const finishCtaLabel = hasCustomNext ? "Continue to your experience" : "Create my profile";

	return (
		<div className="min-h-[80vh] flex items-center justify-center py-16">
			<div className="w-full max-w-4xl">
				<header className="mb-6 border-b border-border/60 px-6 py-4">
					{/* <div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
								Step {currentStepIndex + 1} of {steps.length}
							</p>
							<h2 className="text-lg font-semibold text-foreground">{steps[currentStepIndex].title}</h2>
							<p className="text-sm text-muted-foreground">{steps[currentStepIndex].description}</p>
						</div>
					</div> */}
					<nav aria-label="Onboarding progress" className="hidden lg:block">
						<ol className="flex items-center gap-3">
							{progressSteps.map((step) => {
								const isLast = step.index === progressSteps.length - 1;
								const circleBase = "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold";
								const lineBase = "h-[2px] flex-1";
								const currentClasses =
									step.status === "complete"
										? "border-primary bg-primary text-primary-foreground"
										: step.status === "current"
										? "border-primary text-primary"
										: "border-border/70 text-muted-foreground";
								const lineClasses = step.status === "complete" ? "bg-primary" : step.status === "current" ? "bg-primary/60" : "bg-border/60";
								return (
									<li key={step.title} className={`flex items-center gap-3 ${isLast ? "ml-auto flex-none justify-end" : "flex-1"}`}>
										<div className="flex items-center gap-3">
											<span className={`${circleBase} ${currentClasses}`}>{step.index + 1}</span>
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{step.title}</p>
											</div>
										</div>
										{isLast ? null : <div className={`${lineBase} ${lineClasses}`} />}
									</li>
								);
							})}
						</ol>
					</nav>
				</header>

				{/* <Card className="mx-6"> */}
				<div className="mx-6">
					<div className="space-y-8 pt-6 min-h-80">
						{currentStepIndex === 0 ? (
							<section>
								<h2 className="text-lg font-medium">Confirm your email</h2>
								<div className="space-y-3">
									<p className="text-sm text-muted-foreground">
										We sent a verification email to <strong>{user.email}</strong>. Click the link inside to confirm.
									</p>
									<ResendVerificationButton className="mt-6" email={user.email ?? ""} />
								</div>
							</section>
						) : null}

						{currentStepIndex === 1 ? (
							<section>
								<h2 className="text-lg font-medium">Set up your account</h2>
								<div className="max-w-xl">
									<OnboardingProfileForm
										formId="onboarding-profile"
										defaultName={session.user.name ?? user.name}
										defaultBirthDate={
											user.birthDate
												? `${new Date(user.birthDate).getFullYear()}-${String(new Date(user.birthDate).getMonth() + 1).padStart(2, "0")}-${String(
														new Date(user.birthDate).getDate()
												  ).padStart(2, "0")}`
												: ""
										}
										defaultTermsAccepted={!!user.termsAcceptedAt}
										disabled={!emailConfirmed}
									/>
								</div>
							</section>
						) : null}

						{currentStepIndex === 2 ? (
							<section className="flex flex-col items-center justify-center py-10 text-center">
								<div className="mb-4 rounded-full bg-emerald-50 p-3 text-emerald-600 ring-1 ring-emerald-200">
									<CheckCircle2 className="size-8" />
								</div>
								<h2 className="text-2xl font-semibold tracking-tight">You’re all set!</h2>
								<p className="mt-2 max-w-md text-sm text-muted-foreground">
									Your account is ready. You can now create your full profile to unlock more features, or skip for now.
								</p>
							</section>
						) : null}
					</div>
					<div className="flex items-center justify-between">
						{currentStepIndex === 2 ? (
							<Link className="text-sm text-muted-foreground underline" href={`/api/onboarding/complete?next=${encodeURIComponent(skipNextPath)}`}>
								{skipLinkLabel}
							</Link>
						) : (
							<span />
						)}
						{currentStepIndex === 2 ? (
							<CtaButton asChild>
								<Link href={`/api/onboarding/complete?next=${encodeURIComponent(finishNextPath)}`}>{finishCtaLabel}</Link>
							</CtaButton>
						) : (
							<CtaButton
								form={currentStepIndex === 1 ? "onboarding-profile" : undefined}
								type={currentStepIndex === 1 ? "submit" : "button"}
								color="black"
								disabled={currentStepIndex === 0}
							>
								Next
							</CtaButton>
						)}
					</div>
				</div>
				{/* </Card> */}
			</div>
		</div>
	);
}

function formatDateInput(date?: Date | null) {
	if (!date) return "";
	const d = new Date(date);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

async function ProfileForm({ disabled }: { disabled: boolean }) {
	// Server Component form using standard action to /api/profile
	const session = await getServerAuthSession();
	const user = session?.user
		? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, birthDate: true, termsAcceptedAt: true } })
		: null;
	return (
		<form action="/api/profile" method="post" className="grid grid-cols-1 gap-4" encType="application/x-www-form-urlencoded">
			<fieldset disabled={disabled} className="contents">
				<label className="space-y-1">
					<span className="text-sm">Full name</span>
					<input type="text" name="name" defaultValue={user?.name ?? ""} className="w-full rounded-md border bg-background p-2 text-sm" required />
				</label>
				<label className="space-y-1">
					<span className="text-sm">Birth date</span>
					<input
						type="date"
						name="birthDate"
						defaultValue={formatDateInput(user?.birthDate ?? null)}
						className="w-full rounded-md border bg-background p-2 text-sm"
						required
					/>
				</label>
				<div className="flex items-center gap-2">
					<input type="hidden" name="acceptTerms" value="false" />
					<input id="acceptTerms" type="checkbox" name="acceptTerms" value="true" defaultChecked={!!user?.termsAcceptedAt} required />
					<label htmlFor="acceptTerms" className="text-sm">
						I agree to the Terms of Service and Privacy Policy
					</label>
				</div>
				<div>
					<CtaButton type="submit" disabled={disabled}>
						Save
					</CtaButton>
				</div>
			</fieldset>
		</form>
	);
}
