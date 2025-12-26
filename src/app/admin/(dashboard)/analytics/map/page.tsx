"use client";

import { useEffect, useState, useCallback } from "react";
import { ConsoleSubPage } from "@/components/console/subpage";
import { WorldMap } from "@/components/analytics/world-map";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getRealTimeVisitorMapData, getRealTimeVisitorTimeline } from "@/app/actions/analytics";
import { VisitorTimeline } from "@/components/analytics/visitor-timeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnalyticsMapPage() {
    const [period, setPeriod] = useState<"30m" | "24h" | "7d" | "30d">("30m");
    const [data, setData] = useState<{
        countries: { country: string; visitors: number }[];
        cities: { name: string; coordinates: [number, number]; visitors: number }[];
    }>({ countries: [], cities: [] });
    const [timelineData, setTimelineData] = useState<{ minute: string; count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        // Don't set loading on poll, only initial? 
        // Actually fine to keep ui stable, maybe show a small loading indicator? 
        // For now just background update is fine.
        try {
            const [mapData, timeline] = await Promise.all([
                getRealTimeVisitorMapData(period),
                getRealTimeVisitorTimeline(period)
            ]);
            setData(mapData);
            setTimelineData(timeline);
        } catch (error) {
            console.error("Failed to fetch map data", error);
        } finally {
            setIsLoading(false);
        }
    }, [period]);

    useEffect(() => {
        setIsLoading(true);
        fetchData();

        const interval = setInterval(() => {
            fetchData();
        }, 30000);

        return () => clearInterval(interval);
    }, [period, fetchData]);

    return (
        <ConsoleSubPage
            title="Real-time Visitors Map"
            subtitle={`Live view of user activity across the globe (${period === '30m' ? 'Last 30 mins' : period === '24h' ? 'Last 24 hours' : period === '7d' ? 'Last 7 days' : 'Last 30 days'})`}
            backHref="/admin/analytics"
            backLabel="Back to Analytics"
            badgeLabel="Live"
            action={
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(val) => setPeriod(val as any)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30m">Last 30 Minutes</SelectItem>
                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/analytics">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Overview
                        </Link>
                    </Button>
                </div>
            }
        >
            <div className="grid gap-6">
                {isLoading && data.countries.length === 0 ? (
                    <div className="h-[600px] flex items-center justify-center rounded-lg border bg-card">
                        <span className="text-muted-foreground animate-pulse">Loading real-time data...</span>
                    </div>
                ) : (
                    // <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="grid gap-6">
                        <h3 className="text-lg font-semibold leading-none tracking-tight flex justify-between items-center">
                            <span>Live Traffic Source</span>
                            <span className="text-xs font-normal text-muted-foreground">Updates every 30s</span>
                        </h3>
                        <WorldMap data={data.countries} cities={data.cities} />
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <VisitorTimeline data={timelineData} period={period} />
                        </div>
                    </div>
                    // </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
                        {data.countries.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active visitors</p>
                        ) : (
                            <div className="space-y-4">
                                {data.countries
                                    .sort((a, b) => b.visitors - a.visitors)
                                    .slice(0, 5)
                                    .map((country, i) => (
                                        <div key={country.country} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-muted-foreground w-4">{i + 1}</span>
                                                <span>{country.country}</span>
                                            </div>
                                            <span className="font-bold">{country.visitors.toLocaleString()}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Cities</h3>
                        {data.cities.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active visitors</p>
                        ) : (
                            <div className="space-y-4">
                                {data.cities
                                    .sort((a, b) => b.visitors - a.visitors)
                                    .slice(0, 5)
                                    .map((city, i) => (
                                        <div key={city.name} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-muted-foreground w-4">{i + 1}</span>
                                                <span>{city.name}</span>
                                            </div>
                                            <span className="font-bold">{city.visitors.toLocaleString()}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </ConsoleSubPage>
    );
}
