"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TextareaField } from "@/components/ui/textarea-field";

export type StepVerificationProps = {
	verifyNote: string;
	error: string | null;
	onChangeNote: (value: string) => void;
};

export default function StepVerification({ verifyNote, error, onChangeNote }: StepVerificationProps) {
	return (
		<div className="space-y-4">
			<Card className="border-border/60 bg-card/80 shadow-sm">
				<CardHeader>
					<h3 className="text-base font-semibold text-foreground">Verification</h3>
					<p className="text-sm text-muted-foreground">Review details across steps. Approve or reject with a note.</p>
				</CardHeader>
				<CardContent className="space-y-3">
					<TextareaField
						label="Rejection note (optional for approve, required for reject)"
						value={verifyNote}
						onChange={(e) => onChangeNote(e.target.value)}
						rows={4}
					/>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</CardContent>
			</Card>
		</div>
	);
}
