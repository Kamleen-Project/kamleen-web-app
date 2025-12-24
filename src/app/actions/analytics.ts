"use server";

import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { prisma } from "@/lib/prisma";

const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) {
    console.warn("Analytics: Missing PostHog Project ID or API Key.");
}

export type AnalyticsStats = {
    views: number;
    visitors: number;
    sessions: number;
    viewsChange: number;
    visitorsChange: number;
    sessionsChange: number;
};

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
    const dateFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const dateTo = format(new Date(), "yyyy-MM-dd");
    const prevDateFrom = format(subDays(new Date(), 14), "yyyy-MM-dd");
    const prevDateTo = format(subDays(new Date(), 7), "yyyy-MM-dd");

    // Fixed Query: using '$session_id' instead of 'session_id'
    // Also using 'distinct_id' instead of 'person_id' just in case, though person_id often works.
    // '$session_id' is the property name for session ID in PostHog events.
    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
            select
                countIf(event = '$pageview' and timestamp >= toDate('${dateFrom}') and timestamp < toDate('${dateTo}') + interval 1 day) as views,
                count(distinct if(event = '$pageview' and timestamp >= toDate('${dateFrom}') and timestamp < toDate('${dateTo}') + interval 1 day, distinct_id, null)) as visitors,
                count(distinct if(event = '$pageview' and timestamp >= toDate('${dateFrom}') and timestamp < toDate('${dateTo}') + interval 1 day, properties.$session_id, null)) as sessions,
                
                countIf(event = '$pageview' and timestamp >= toDate('${prevDateFrom}') and timestamp < toDate('${prevDateTo}')) as prev_views,
                count(distinct if(event = '$pageview' and timestamp >= toDate('${prevDateFrom}') and timestamp < toDate('${prevDateTo}'), distinct_id, null)) as prev_visitors,
                count(distinct if(event = '$pageview' and timestamp >= toDate('${prevDateFrom}') and timestamp < toDate('${prevDateTo}'), properties.$session_id, null)) as prev_sessions
            from events
            where timestamp >= toDate('${prevDateFrom}')
        `
        }
    };

    // Debug Log
    console.log("Analytics: Fetching Stats...", { POSTHOG_HOST, POSTHOG_PROJECT_ID, dateFrom, dateTo });

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(queryPayload),
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Analytics: PostHog Stats Request Failed:", response.status, errorText);
            return { views: 0, visitors: 0, sessions: 0, viewsChange: 0, visitorsChange: 0, sessionsChange: 0 };
        }

        const data = await response.json();
        console.log("Analytics: Stats Data Received:", JSON.stringify(data, null, 2));

        if (!data.results || data.results.length === 0) {
            console.warn("Analytics: No results in HogQL response");
            return { views: 0, visitors: 0, sessions: 0, viewsChange: 0, visitorsChange: 0, sessionsChange: 0 };
        }

        const [views, visitors, sessions, prev_views, prev_visitors, prev_sessions] = data.results[0];

        const parseNum = (n: any) => Number(n) || 0;

        const v = parseNum(views);
        const vis = parseNum(visitors);
        const sess = parseNum(sessions);
        const pv = parseNum(prev_views);
        const pvis = parseNum(prev_visitors);
        const psess = parseNum(prev_sessions);

        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            views: v,
            visitors: vis,
            sessions: sess,
            viewsChange: calculateChange(v, pv),
            visitorsChange: calculateChange(vis, pvis),
            sessionsChange: calculateChange(sess, psess),
        };
    } catch (error) {
        console.error("Analytics: Error fetching stats:", error);
        return { views: 0, visitors: 0, sessions: 0, viewsChange: 0, visitorsChange: 0, sessionsChange: 0 };
    }
}


export type TrendData = {
    date: string;
    views: number;
    visitors: number;
};

export async function getAnalyticsTrend(): Promise<TrendData[]> {
    const dateFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");

    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    toDate(timestamp) as day,
                    countIf(event = '$pageview') as views,
                    count(distinct distinct_id) as visitors
                from events
                where timestamp >= toDate('${dateFrom}')
                group by day
                order by day asc
            `
        }
    };

    console.log("Analytics: Fetching Trend...", { dateFrom });

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(queryPayload),
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Analytics: PostHog Trend Request Failed:", response.status, errorText);
            return [];
        }

        const data = await response.json();

        if (!data.results) return [];

        return data.results.map((row: any) => ({
            date: format(new Date(row[0]), "MMM dd"),
            views: Number(row[1]) || 0,
            visitors: Number(row[2]) || 0
        }));
    } catch (error) {
        console.error("Analytics: Error fetching trend:", error);
        return [];
    }
}

export type TopExperience = {
    title: string;
    slug: string;
    views: number;
    organizer: string;
};

export async function getTopExperiences(limit: number = 5): Promise<TopExperience[]> {
    const dateFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

    // Using HogQL to get top paths that match /experiences/*
    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    properties.$current_url,
                    count() as view_count
                from events
                where event = '$pageview'
                  and timestamp >= toDate('${dateFrom}')
                  and properties.$current_url like '%/experiences/%'
                  and not (properties.$current_url like '%/admin/%')
                group by properties.$current_url
                order by view_count desc
                limit ${limit}
            `
        }
    };

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(queryPayload),
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            console.error("Analytics: Top Experiences Req Failed", response.status);
            return [];
        }

        const data = await response.json();
        if (!data.results) return [];

        // Extract slugs from URLs
        const slugCountMap = new Map<string, number>();

        data.results.forEach((row: any) => {
            const url = row[0] as string;
            const count = Number(row[1]);
            try {
                // simple parse: assume last part is slug
                // Check if it's a full URL or relative path
                let pathname = url;
                if (url.startsWith('http')) {
                    const urlObj = new URL(url);
                    pathname = urlObj.pathname;
                }

                const pathParts = pathname.split('/').filter(Boolean);
                // Expected format: /experiences/[slug]
                // pathParts might be ['experiences', 'slug']

                // Find 'experiences' index
                const expIndex = pathParts.indexOf('experiences');
                if (expIndex !== -1 && expIndex + 1 < pathParts.length) {
                    const slug = pathParts[expIndex + 1];
                    // Avoid sub-pages like /experiences/slug/reviews if we only want main page?
                    // Or count all. User asked for "views for experiences pages".
                    // Usually aggregate is better.
                    // For now, let's just take the immediate slug.
                    slugCountMap.set(slug, (slugCountMap.get(slug) || 0) + count);
                }
            } catch (e) {
                // ignore
            }
        });

        const slugs = Array.from(slugCountMap.keys());
        if (slugs.length === 0) return [];

        const dbExperiences = await prisma.experience.findMany({
            where: { slug: { in: slugs } },
            select: { slug: true, title: true, organizer: { select: { name: true } } }
        });

        const result: TopExperience[] = dbExperiences.map(exp => ({
            title: exp.title,
            slug: exp.slug,
            views: slugCountMap.get(exp.slug) || 0,
            organizer: exp.organizer?.name || "Unknown"
        }));

        return result.sort((a, b) => b.views - a.views);

    } catch (error) {
        console.error("Analytics: Error fetching top experiences", error);
        return [];
    }
}

export async function getExperienceViews(slugs: string[]): Promise<Record<string, number>> {
    if (slugs.length === 0) return {};

    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    properties.$current_url,
                    count() as view_count
                from events
                where event = '$pageview'
                  and properties.$current_url like '%/experiences/%'
                group by properties.$current_url
            `
        }
    };

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
            method: "POST",
            body: JSON.stringify(queryPayload),
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) return {};

        const data = await response.json();
        const results: Record<string, number> = {};

        if (data.results) {
            data.results.forEach((row: any) => {
                const url = row[0] as string;
                const count = Number(row[1]);

                let pathname = url;
                if (url.startsWith('http')) {
                    try {
                        const urlObj = new URL(url);
                        pathname = urlObj.pathname;
                    } catch (e) { }
                }

                const pathParts = pathname.split('/').filter(Boolean);
                const expIndex = pathParts.indexOf('experiences');

                if (expIndex !== -1 && expIndex + 1 < pathParts.length) {
                    const slug = pathParts[expIndex + 1];
                    if (slugs.includes(slug)) {
                        results[slug] = (results[slug] || 0) + count;
                    }
                }
            });
        }
        return results;

    } catch (error) {
        console.error("Analytics: Error fetching experience views", error);
        return {};
    }
}
