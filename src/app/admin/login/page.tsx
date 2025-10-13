import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";

interface AdminLoginPageProps {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
	const session = await getServerAuthSession();

	if (session?.user?.role === "ADMIN") {
		redirect("/admin");
	}

	if (session?.user) {
		redirect("/");
	}

	const resolvedSearch = searchParams ? await searchParams : undefined;
	const errorValue = resolvedSearch?.error;
	const error = Array.isArray(errorValue) ? errorValue[0] : errorValue;

	let message: string | null = null;

	if (error === "signin") {
		message = "Sign in with an administrator account to continue.";
	} else if (error === "forbidden") {
		message = "This area is limited to admin users. Please switch to an authorized account.";
	}

	if (session?.user) {
		message = message ?? "This area is limited to admin users.";
	}

	return (
		<div className="min-h-[80vh]">
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 py-24 text-center">
				<div className="space-y-2">
					<p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Kamleen Admin</p>
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">Sign in to the control center</h1>
					<p className="text-sm text-muted-foreground">Use your administrator credentials to manage users, organizer onboarding, and platform quality.</p>
				</div>

				<Card className="w-full max-w-md border border-border/60 bg-card shadow-xl text-left">
					<CardHeader className="gap-2">
						<h2 className="text-xl font-semibold text-foreground">Admin login</h2>
						{message ? <p className="text-sm text-destructive/80">{message}</p> : null}
					</CardHeader>
					<CardContent className="gap-6">
						<LoginForm redirectTo="/admin" mode="admin" />
					</CardContent>
					<CardFooter className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground">
						<p>
							Need a standard explorer account instead?{" "}
							<Link href="/login" className="font-medium text-primary underline">
								Go to the main sign in
							</Link>
							.
						</p>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
