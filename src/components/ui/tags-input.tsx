"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

type TagsInputProps = {
	label?: React.ReactNode;
	caption?: React.ReactNode;
	error?: string;
	tags: string[];
	inputValue: string;
	onChangeInput: (value: string) => void;
	onAddTags: (tags: string[]) => void;
	onRemoveTag: (tag: string) => void;
	placeholder?: string;
	containerClassName?: string;
};

export function TagsInput({ label, caption, error, tags, inputValue, onChangeInput, onAddTags, onRemoveTag, placeholder, containerClassName }: TagsInputProps) {
	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && inputValue.trim()) {
			event.preventDefault();
			onAddTags([inputValue.trim()]);
			onChangeInput("");
		} else if (event.key === "Backspace" && !inputValue && tags.length > 0) {
			event.preventDefault();
			onRemoveTag(tags[tags.length - 1]);
		}
	};

	return (
		<div className={cn("space-y-2", containerClassName)}>
			<FormField error={typeof error === "string" ? error : undefined} description={typeof caption === "string" ? caption : undefined}>
				{label ? <FormLabel>{label}</FormLabel> : null}
				<FormControl>
					<div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
						{tags.map((tag) => (
							<span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
								{tag}
								<button
									type="button"
									className="text-muted-foreground transition hover:text-destructive"
									onClick={() => onRemoveTag(tag)}
									aria-label={`Remove ${tag}`}
								>
									×
								</button>
							</span>
						))}
						<input
							value={inputValue}
							onChange={(event) => {
								const value = event.target.value;
								if (value.includes(",")) {
									const parts = value
										.split(",")
										.map((v) => v.trim())
										.filter(Boolean);
									if (parts.length) onAddTags(parts);
									onChangeInput("");
								} else {
									onChangeInput(value);
								}
							}}
							onKeyDown={handleKeyDown}
							onBlur={() => (inputValue ? onAddTags([inputValue]) : undefined)}
							placeholder={placeholder ?? (tags.length ? "Add more" : "wellness")}
							className="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none"
						/>
					</div>
				</FormControl>
				{caption && typeof caption !== "string" ? <div className="text-xs text-muted-foreground">{caption}</div> : <FormDescription />}
				<FormMessage />
			</FormField>
		</div>
	);
}

TagsInput.displayName = "TagsInput";
