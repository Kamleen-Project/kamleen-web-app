import { Activity } from "lucide-react";
import Link from "next/link";

import { ConsolePage } from "@/components/console/page";
import { Button } from "@/components/ui/button";
import { getAnalyticsStats, getAnalyticsTrend, getTopExperiences } from "@/app/actions/analytics";
import { AnalyticsStatsCards } from "@/components/admin/analytics/analytics-stats";
import { AnalyticsChart } from "@/components/admin/analytics/analytics-chart";

import { AnalyticsRefreshButton } from "@/components/admin/analytics/refresh-button";
import { AnalyticsTopExperiences } from "@/components/admin/analytics/analytics-top-experiences";

export default async function AdminAnalyticsPage() {
    const [stats, trend, topExperiences] = await Promise.all([
        getAnalyticsStats(),
        getAnalyticsTrend(),
        getTopExperiences(5)
    ]);

    return (
        <ConsolePage
            title="Analytics"
            subtitle="View user engagement and traffic insights."
            action={
                <div className="flex items-center gap-2">
                    <AnalyticsRefreshButton />
                    <Button asChild>
                        <Link href="https://us.posthog.com/project/settings" target="_blank" rel="noopener noreferrer">
                            <Activity className="mr-2 h-4 w-4" />
                            Open PostHog
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
