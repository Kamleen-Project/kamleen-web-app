"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import CtaIconButton from "@/components/ui/cta-icon-button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { Calendar, type CalendarDateRange } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

	const [open, setOpen] = useState(false);
	const [dateRange, setDateRange] = useState<CalendarDateRange>(() => ({
		from: parseDate(defaults.start),
		to: parseDate(defaults.end),
	}));

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

	const formattedStart = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
	const formattedEnd = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";
	const dateLabel = dateRange.from
		? dateRange.to
			? `${format(dateRange.from, "LLL dd, yyyy")} – ${format(dateRange.to, "LLL dd, yyyy")}`
			: format(dateRange.from, "LLL dd, yyyy")
		: "Add dates";

	const handleDateSelect = (range: CalendarDateRange | undefined) => {
		setDateRange(range ?? {});

		if (range?.from && range?.to) {
			setOpen(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="grid gap-4 p-4 text-black sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
			<div className="flex flex-col gap-2 text-left">
				<Input id="exp-search-q" name="q" defaultValue={defaults.q} placeholder="City, host, or experience" className="h-12" />
			</div>
			<div className="flex flex-col gap-2 text-left">
				<input type="hidden" name="start" value={formattedStart} readOnly />
				<input type="hidden" name="end" value={formattedEnd} readOnly />
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className={cn("h-12 justify-start gap-2 text-left font-normal", !dateRange.from && "text-muted-foreground")}
						>
							<CalendarIcon className="size-4" />
							{dateLabel}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
						<Calendar value={dateRange} onChange={handleDateSelect} monthCount={2} />
					</PopoverContent>
				</Popover>
			</div>
			<div className="flex flex-col gap-2 text-left">
				{/* Hidden field carries the numeric value for form submission */}
				<input id="exp-search-guests" type="hidden" name="guests" value={guests} readOnly />
				<div className="flex items-center justify-between">
					<Stepper value={guests} onChange={(value) => setGuests(value)} min={1} max={100} className="" />
				</div>
			</div>
			<div className="flex items-end justify-end">
				<CtaIconButton type="submit" color="black" size="lg" className="h-12 w-12" ariaLabel="Search experiences">
					<Search className="size-5" />
				</CtaIconButton>
			</div>
		</form>
	);
}
