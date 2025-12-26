
import { Activity } from "lucide-react";
import Link from "next/link";

import { ConsolePage } from "@/components/console/page";
import { Button } from "@/components/ui/button";
import { getAnalyticsStats, getAnalyticsTrend, getTopExperiences, AnalyticsPeriod } from "@/app/actions/analytics";
import { AnalyticsStatsCards } from "@/components/admin/analytics/analytics-stats";
import { AnalyticsChart } from "@/components/admin/analytics/analytics-chart";

import { AnalyticsRefreshButton } from "@/components/admin/analytics/refresh-button";
import { AnalyticsTopExperiences } from "@/components/admin/analytics/analytics-top-experiences";
import { DateFilter } from "@/components/admin/analytics/date-filter";

interface AdminAnalyticsPageProps {
    searchParams: Promise<{
        period?: string;
    }>;
}

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
    const resolvedSearchParams = await searchParams;
    const period = (resolvedSearchParams?.period as AnalyticsPeriod) || "7d";

    const [stats, trend, topExperiences] = await Promise.all([
        getAnalyticsStats(period),
        getAnalyticsTrend(period),
        getTopExperiences(5, period)
    ]);

    return (
        <ConsolePage
            title="Analytics"
            subtitle="View user engagement and traffic insights."
            action={
                <div className="flex items-center gap-2">
                    <DateFilter />
                    <AnalyticsRefreshButton />
                    <Button variant="outline" asChild>
                        <Link href="/admin/analytics/map">
                            <Activity className="mr-2 h-4 w-4" />
                            Global Map
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/admin/analytics/live">
                            <Activity className="mr-2 h-4 w-4 text-red-500 animate-pulse" />
                            Live Visitors
                        </Link>
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <AnalyticsStatsCards stats={stats} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        <AnalyticsChart data={trend} />
                    </div>
                    <div className="col-span-3">
                        <AnalyticsTopExperiences data={topExperiences} />
                    </div>
                </div>
            </div>
        </ConsolePage>
    );
}
