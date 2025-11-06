"use client";

import { createContext, useContext, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type FieldContextValue = {
	id: string;
	error?: string;
	description?: string;
};

const FieldContext = createContext<FieldContextValue | undefined>(undefined);

export function useFieldContext() {
	const context = useContext(FieldContext);
	if (!context) {
		throw new Error("useFieldContext must be used within <FormField>");
	}
	return context;
}

type FormFieldProps = {
	children: React.ReactNode;
	error?: string;
	description?: string;
};

export function FormField({ children, error, description }: FormFieldProps) {
	const id = useId();
	const value = useMemo(() => ({ id, error, description }), [id, error, description]);

	return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

type FormLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function FormLabel({ className, ...props }: FormLabelProps) {
	const field = useFieldContext();
	return <label htmlFor={field.id} className={cn("mb-2 block text-sm font-medium leading-tight text-foreground", className)} {...props} />;
}

type FormControlProps = React.HTMLAttributes<HTMLDivElement>;

export function FormControl({ className, children, ...props }: FormControlProps) {
	const field = useFieldContext();
	return (
		<div className={cn("space-y-2", className)} role="group" aria-describedby={field.description ? `${field.id}-description` : undefined} {...props}>
			{children}
		</div>
	);
}

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function FormInput({ className, ...props }: FormInputProps) {
	const field = useFieldContext();
	return (
		<input
			id={field.id}
			className={cn(
				"flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm transition hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			{...props}
		/>
	);
}

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function FormTextarea({ className, ...props }: FormTextareaProps) {
	const field = useFieldContext();
	return (
		<textarea
			id={field.id}
			className={cn(
				"min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			{...props}
		/>
	);
}

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function FormSelect({ className, children, ...props }: FormSelectProps) {
	const field = useFieldContext();
	return (
		<div className="relative">
			<select
				id={field.id}
				className={cn(
					"flex h-11 w-full appearance-none rounded-lg border border-input bg-background px-4 pr-10 text-base transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
					className
				)}
				{...props}
			>
				{children}
			</select>
			<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		</div>
	);
}

type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FormDescription({ className, children, ...props }: FormDescriptionProps) {
	const field = useFieldContext();
	if (!children) return null;
	return (
		<p id={`${field.id}-description`} className={cn("text-xs text-muted-foreground", className)} {...props}>
			{children}
		</p>
	);
}

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FormMessage({ className, ...props }: FormMessageProps) {
	const field = useFieldContext();
	if (!field.error) return null;
	return (
		<p className={cn("text-sm text-destructive", className)} role="alert" {...props}>
			{field.error}
		</p>
	);
}
