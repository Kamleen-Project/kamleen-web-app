"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

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

	const hasFilters = q.trim() !== "" || Boolean(dateRange?.from || dateRange?.to) || guests !== "1";

	return (
		<form onSubmit={handleSubmit} className="grid gap-4 p-4 text-black sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
			<InputField id="exp-search-q" name="q" value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="City, host, or experience" />
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
			<div className="flex flex-row gap-2 justify-between ">
				{/* Hidden field carries the numeric value for form submission */}
				<input id="exp-search-guests" type="hidden" name="guests" value={guests} readOnly />
				<div className="flex items-center justify-between">
					<Stepper value={guests} onChange={(value) => setGuests(value)} min={1} max={100} className="" />
				</div>
				<div className="flex items-end justify-end gap-2">
					{hasFilters ? (
						<CtaIconButton type="button" color="whiteBorder" size="lg" className="h-12 w-12" ariaLabel="Reset search" onClick={handleReset}>
							<X className="size-5" />
						</CtaIconButton>
					) : null}
					<CtaIconButton type="submit" color="black" size="lg" className="h-12 w-12" ariaLabel="Search experiences">
						<Search className="size-5" />
					</CtaIconButton>
				</div>
			</div>

		</form>
	);
}
