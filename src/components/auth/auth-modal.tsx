"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { TogetherLogo } from "@/components/branding";

type AuthMode = "login" | "register";

type AuthModalProps = {
	open: boolean;
	mode: AuthMode;
	onOpenChange: (next: boolean) => void;
	onModeChange: (next: AuthMode) => void;
};

export function AuthModal({ open, mode, onOpenChange, onModeChange }: AuthModalProps) {
	const { data: session } = useSession();

	// Auto-close when a session appears (successful login/register)
	useEffect(() => {
		if (session?.user && open) onOpenChange(false);
	}, [session?.user, open, onOpenChange]);

	const isLogin = mode === "login";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<div className="flex w-full justify-center">
					<TogetherLogo className="h-12 w-auto m-4" title="Kamleen" variant="light" />
				</div>
				<DialogHeader>
					{isLogin ? (
						<>
							<DialogDescription className="uppercase tracking-[0.2em] font-semibold">Welcome back</DialogDescription>
							<DialogTitle>Sign in to Kamleen</DialogTitle>
						</>
					) : (
						<>
							<DialogDescription className="uppercase tracking-[0.2em] font-semibold">Join Kamleen</DialogDescription>
							<DialogTitle>Create your explorer account</DialogTitle>
						</>
					)}
				</DialogHeader>
				<div className="mt-2">{isLogin ? <LoginForm mode="user" /> : <RegisterForm />}</div>
				<div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
					{isLogin ? (
						<>
							<span>New here?</span>
							<button type="button" className="font-medium text-primary underline" onClick={() => onModeChange("register")}>
								Create an account
							</button>
						</>
					) : (
						<>
							<span>Already have an account?</span>
							<button type="button" className="font-medium text-primary underline" onClick={() => onModeChange("login")}>
								Sign in instead
							</button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
