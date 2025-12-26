"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type AnalyticsPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'last_month' | 'last_year' | 'all';

export function DateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const period = searchParams.get("period") || "7d";

    const handleValueChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", value);
        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    return (
        <Select value={period} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
        </Select>
    );
}
