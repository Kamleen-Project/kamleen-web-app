"use client";

import { Activity, Users, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsStats } from "@/app/actions/analytics";

interface AnalyticsStatsCardsProps {
    stats: AnalyticsStats;
}

export function AnalyticsStatsCards({ stats }: AnalyticsStatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatsCard
                title="Page Views"
                value={stats.views}
                change={stats.viewsChange}
                icon={Activity}
                description="Total views in last 7 days"
            />
            <StatsCard
                title="Unique Visitors"
                value={stats.visitors}
                change={stats.visitorsChange}
                icon={Users}
                description="Unique users in last 7 days"
            />
            <StatsCard
                title="Sessions"
                value={stats.sessions}
                change={stats.sessionsChange}
                icon={MousePointerClick}
                description="Total sessions in last 7 days"
            />
        </div>
    );
}

function StatsCard({ title, value, change, icon: Icon, description }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">
                    {change > 0 && "+"}
                    {change}% from last week
                </p>
            </CardContent>
        </Card>
    )
}
