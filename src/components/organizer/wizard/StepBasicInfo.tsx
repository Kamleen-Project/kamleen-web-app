"use client";

import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { RadioGroupField } from "@/components/ui/radio-group-field";
import { SelectField } from "@/components/ui/select-field";
import { TagsInput } from "@/components/ui/tags-input";
import { PriceInput } from "@/components/ui/price-input";
import { DurationSelector } from "@/components/ui/duration-selector";
import type { WizardState } from "@/types/experience-wizard";

type Category = { id: string; name: string };

export type StepBasicInfoProps = {
	state: WizardState;
	categories: Category[];
	displayCurrency: string;
	onChangeBasicField: (key: keyof WizardState, value: string) => void;
	onSetTagInput: (value: string) => void;
	onAddTags: (values: string[]) => void;
	onRemoveTag: (tag: string) => void;
};

export default function StepBasicInfo({ state, categories, displayCurrency, onChangeBasicField, onSetTagInput, onAddTags, onRemoveTag }: StepBasicInfoProps) {
	return (
		<div className="space-y-6">
			<InputField
				label={"Experience title"}
				value={state.title}
				onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChangeBasicField("title", event.target.value)}
				required
			/>

			<InputField
				label={"Short summary"}
				value={state.summary}
				onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChangeBasicField("summary", event.target.value)}
				placeholder="What guests can expect"
				caption="Appears on cards and promotional surfaces."
				required
			/>

			<TextareaField
				label={"Detailed description"}
				rows={6}
				value={state.description}
				onChange={(event) => onChangeBasicField("description", event.target.value)}
				placeholder="Outline the flow, expectations, and highlights."
				minLength={200}
				maxLength={1000}
				caption="Appears on the experience page. Minimum 200 characters."
				showCounter
				required
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<RadioGroupField
						label={"Audience"}
						name="audience"
						value={state.audience}
						onChange={(val) => onChangeBasicField("audience", val)}
						options={[
							{ value: "all", label: "All" },
							{ value: "men", label: "Men" },
							{ value: "women", label: "Women" },
							{ value: "kids", label: "Kids" },
						]}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<SelectField
						label={"Category"}
						value={state.categoryId}
						required
						onChange={(event) => {
							const id = event.target.value;
							const match = categories.find((c) => c.id === id);
							onChangeBasicField("categoryId", id);
							// keep category name in sync for server payloads
							onChangeBasicField("category", match?.name ?? state.category);
						}}
					>
						<option value="">Select a category</option>
						{categories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</SelectField>
				</div>
				<div className="space-y-2">
					<TagsInput
						label="Tags"
						tags={state.tags}
						inputValue={state.tagInput}
						onChangeInput={(value) => onSetTagInput(value)}
						onAddTags={(parts) => onAddTags(parts)}
						onRemoveTag={(tag) => onRemoveTag(tag)}
						caption={"Press enter to add tags. They help explorers find your experience."}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<PriceInput
						label={"Price per spot"}
						value={state.price}
						onValueChange={(next) => onChangeBasicField("price", next)}
						required
						currency={displayCurrency}
					/>
				</div>
				<div className="space-y-2">
					<DurationSelector
						label={"Duration"}
						required
						caption={"Share the approximate runtime so guests can plan around it."}
						value={{ days: state.durationDays, hours: state.durationHours, minutes: state.durationMinutes }}
						onChange={(next) => {
							onChangeBasicField("durationDays", next.days);
							onChangeBasicField("durationHours", next.hours);
							onChangeBasicField("durationMinutes", next.minutes);
						}}
						daysEnabled
						hoursEnabled
						minutesEnabled
						maxDays={7}
						maxHours={23}
						minuteStep={5}
					/>
				</div>
			</div>
		</div>
	);
}
