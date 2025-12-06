import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
	const session = await getServerAuthSession();

	if (session?.user) {
		redirect("/dashboard");
	}

	return (
		<div className="min-h-[80vh]">
			<Container className="flex items-center justify-center py-24">
				<Card className="w-full max-w-md border border-border/60 bg-card shadow-xl">
					<CardHeader className="gap-3">
						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
							<h1 className="text-2xl font-semibold tracking-tight">Sign in to Kamleen</h1>
						</div>
					</CardHeader>
					<CardContent className="gap-6">
						<LoginForm mode="user" redirectTo={searchParams?.callbackUrl} />
					</CardContent>
					<CardFooter className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<span className="text-center sm:text-left">New here?</span>
						<Link href="/register" className="font-medium text-primary underline">
							Create an account
						</Link>
					</CardFooter>
				</Card>
			</Container>
		</div>
	);
}
