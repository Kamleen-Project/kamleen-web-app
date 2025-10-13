import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerAuthSession } from "@/lib/auth";

export default async function RegisterPage() {
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
							<p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Join Kamleen</p>
							<h1 className="text-2xl font-semibold tracking-tight">Create your explorer account</h1>
						</div>
					</CardHeader>
					<CardContent className="gap-6">
						<RegisterForm />
					</CardContent>
					<CardFooter className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<span className="text-center sm:text-left">Already have an account?</span>
						<Link href="/login" className="font-medium text-primary underline">
							Sign in instead
						</Link>
					</CardFooter>
				</Card>
			</Container>
		</div>
	);
}
