"use client";

import { ConsoleSubPage } from "@/components/console/subpage";
import { LiveVisitorsCard } from "@/components/analytics/live-visitor-card";
import { ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnalyticsLivePage() {
    return (
        <ConsoleSubPage
            title="Live Visitors"
            subtitle="Real-time view of active users on your site in the last 5 minutes."
            backHref="/admin/analytics"
            backLabel="Back to Analytics"
            badgeLabel="Live Now"
            action={
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/analytics/map">
                            <Globe className="mr-2 h-4 w-4" />
                            Global Map
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/analytics">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Overview
                        </Link>
                    </Button>
                </div>
            }
        >
            <div className="max-w-5xl mx-auto">
                <LiveVisitorsCard />
            </div>
        </ConsoleSubPage>
    );
}
