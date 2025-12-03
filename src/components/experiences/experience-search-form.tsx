"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { InputField } from "@/components/ui/input-field";
import { Stepper } from "@/components/ui/stepper";
import { DateField } from "@/components/ui/date-field";

type ExperienceSearchFormProps = {
	initialValues?: {
		q?: string;
		start?: string;
		end?: string;
		guests?: string;
	};
};

function parseDate(value?: string | null) {
	if (!value) {
		return undefined;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export function ExperienceSearchForm({ initialValues }: ExperienceSearchFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const defaults = useMemo(
		() => ({
			q: initialValues?.q ?? searchParams.get("q") ?? "",
			start: initialValues?.start ?? searchParams.get("start") ?? "",
			end: initialValues?.end ?? searchParams.get("end") ?? "",
			guests: initialValues?.guests ?? searchParams.get("guests") ?? "",
		}),
		[initialValues?.q, initialValues?.start, initialValues?.end, initialValues?.guests, searchParams]
	);

	const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => ({
		from: parseDate(defaults.start),
		to: parseDate(defaults.end),
	}));

	const [q, setQ] = useState<string>(() => String(defaults.q ?? ""));
	const [guests, setGuests] = useState<string>(() => {
		const raw = String(defaults.guests ?? "").trim();
		const initial = raw && Number.parseInt(raw, 10) > 0 ? Number.parseInt(raw, 10) : 1;
		return String(initial);
	});

	const handleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const formData = new FormData(event.currentTarget);
			const params = new URLSearchParams();

			const q = String(formData.get("q") ?? "").trim();
			const start = String(formData.get("start") ?? "").trim();
			const end = String(formData.get("end") ?? "").trim();
			const guests = String(formData.get("guests") ?? "").trim();

			if (q) params.set("q", q);
			if (start) params.set("start", start);
			if (end) params.set("end", end);
			if (guests) params.set("guests", guests);

			const queryString = params.toString();
			router.push(`/experiences${queryString ? `?${queryString}` : ""}`);
		},
		[router]
	);

	const handleReset = useCallback(() => {
		setQ("");
		setDateRange({});
		setGuests("1");
	}, []);

	const [isExpanded, setIsExpanded] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (formRef.current && !formRef.current.contains(event.target as Node)) {
				setIsExpanded(false);
			}
		}

		if (isExpanded) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isExpanded]);

	const hasFilters = q.trim() !== "" || Boolean(dateRange?.from || dateRange?.to) || guests !== "1";

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			className={cn(
				"grid gap-4 p-4 text-black sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]",
				!isExpanded && "gap-0 sm:pb-4 sm:gap-4"
			)}
		>
			<div className="flex w-full items-center gap-2 sm:contents">
				<InputField
					id="exp-search-q"
					name="q"
					value={q}
					onChange={(e) => setQ(e.currentTarget.value)}
					onFocus={() => setIsExpanded(true)}
					placeholder="City, host, or experience"
					className="text-md"
					containerClassName="flex-1"
				/>
				<div className={cn("sm:hidden", isExpanded && "hidden")}>
					<CtaIconButton type="submit" color="black" size="lg" className="h-12 w-12" ariaLabel="Search experiences">
						<Search className="size-5" />
					</CtaIconButton>
				</div>
			</div>

			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-300 ease-in-out sm:contents",
					isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				)}
			>
				<div className="overflow-hidden sm:contents">
					<DateField
						id="exp-search-dates"
						range
						nameStart="start"
						nameEnd="end"
						valueRange={dateRange}
						onChangeRange={(range) => setDateRange(range ?? {})}
						placeholder="Add dates"
						allowTextInput={false}
						monthCount={2}
					/>
					<div className="flex flex-row gap-2 justify-between pt-4 sm:pt-0">
						{/* Hidden field carries the numeric value for form submission */}
						<input id="exp-search-guests" type="hidden" name="guests" value={guests} readOnly />
						<div className="flex items-center justify-between">
							<Stepper value={guests} onChange={(value) => setGuests(value)} min={1} max={100} className="" />
						</div>
						<div className="flex items-end justify-end gap-2">
							{hasFilters ? (
								<CtaIconButton
									type="button"
									color="whiteBorder"
									size="lg"
									className="h-12 w-12"
									ariaLabel="Reset search"
									onClick={handleReset}
								>
									<X className="size-5" />
								</CtaIconButton>
							) : null}
							<CtaIconButton type="submit" color="black" size="lg" className="h-12 w-12" ariaLabel="Search experiences">
								<Search className="size-5" />
							</CtaIconButton>
						</div>
					</div>
				</div>
			</div>

		</form>
	);
}
