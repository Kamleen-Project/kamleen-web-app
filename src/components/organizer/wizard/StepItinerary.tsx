"use client";

import { Card, CardContent } from "@/components/ui/card";
import { InputField } from "@/components/ui/input-field";
import { FormField, FormLabel, FormControl } from "@/components/ui/form";
import { DurationSelector } from "@/components/ui/duration-selector";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { CtaButton } from "@/components/ui/cta-button";
import { Trash } from "lucide-react";
import type { ItineraryItem } from "@/types/experience-wizard";
import { DURATION_MAX_HOURS, DURATION_MINUTE_STEP } from "@/config/experiences";

export type StepItineraryProps = {
	items: ItineraryItem[];
	onAdd: () => void;
	onImageChange: (id: string, file: File) => void;
	onRemoveImage: (id: string) => void;
	onRemoveStep: (id: string) => void;
	onUpdateField: (id: string, key: "title" | "subtitle" | "durationHours" | "durationMinutes", value: string) => void;
};

export default function StepItinerary({ items, onAdd, onImageChange, onRemoveImage, onRemoveStep, onUpdateField }: StepItineraryProps) {
	return (
		<div className="space-y-4">
			{items
				.filter((step) => !step.removed)
				.map((step, index) => (
					<Card key={step.id} className="border-border/60 bg-card/80 shadow-sm">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4 sm:flex-row">
								<div className="flex flex-col items-start shrink-0">
									<h3 className="text-base font-semibold text-foreground">Activity {index + 1}</h3>
									<UploadSinglePicture
										id={`itinerary-image-${step.id}`}
										previewUrl={step.preview ?? step.url ?? null}
										onChangeFile={(file) => onImageChange(step.id, file)}
										onRemove={() => onRemoveImage(step.id)}
										uploadLabel="Upload image"
										aspect="square"
										className="mt-4"
									/>
								</div>
								<div className="space-y-4 flex-1 min-w-0">
									<InputField label={"Title"} value={step.title} onChange={(event) => onUpdateField(step.id, "title", event.target.value)} required />
									<InputField label="Subtitle" value={step.subtitle} onChange={(event) => onUpdateField(step.id, "subtitle", event.target.value)} />
									<FormField>
										<FormLabel>Duration</FormLabel>
										<FormControl>
											<DurationSelector
												value={{ days: "0", hours: step.durationHours ?? "0", minutes: step.durationMinutes ?? "0" }}
												onChange={(next) => {
													onUpdateField(step.id, "durationHours", next.hours);
													onUpdateField(step.id, "durationMinutes", next.minutes);
												}}
												daysEnabled={false}
												hoursEnabled
												minutesEnabled
												maxHours={DURATION_MAX_HOURS}
												minuteStep={DURATION_MINUTE_STEP}
											/>
										</FormControl>
									</FormField>
								</div>
								<CtaIconButton color="whiteBorder" size="md" type="button" onClick={() => onRemoveStep(step.id)} ariaLabel="Remove activity">
									<Trash />
								</CtaIconButton>
							</div>
						</CardContent>
					</Card>
				))}
			<CtaButton color="whiteBorder" size="md" type="button" onClick={onAdd}>
				Add activity
			</CtaButton>
		</div>
	);
}
