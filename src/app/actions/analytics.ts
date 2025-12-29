"use server";



import { subDays, startOfDay, endOfDay, format, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
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

export type AnalyticsPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'last_month' | 'last_year';

function getDateRange(period: AnalyticsPeriod) {
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;
    let prevDateFrom: Date;
    let prevDateTo: Date;

    switch (period) {
        case 'today':
            dateFrom = startOfDay(now);
            dateTo = endOfDay(now); // though query usually handles 'now()' bounded by execution time, explicit is good.
            // Compare to yesterday
            prevDateFrom = startOfDay(subDays(now, 1));
            prevDateTo = endOfDay(subDays(now, 1));
            break;
        case 'yesterday':
            dateFrom = startOfDay(subDays(now, 1));
            dateTo = endOfDay(subDays(now, 1));
            // Compare to day before yesterday
            prevDateFrom = startOfDay(subDays(now, 2));
            prevDateTo = endOfDay(subDays(now, 2));
            break;
        case 'last_month':
            const lastMonth = subMonths(now, 1);
            dateFrom = startOfMonth(lastMonth);
            dateTo = endOfMonth(lastMonth);

            const prevMonth = subMonths(now, 2);
            prevDateFrom = startOfMonth(prevMonth);
            prevDateTo = endOfMonth(prevMonth);
            break;
        case 'last_year':
            const lastYear = subYears(now, 1);
            dateFrom = startOfYear(lastYear);
            dateTo = endOfYear(lastYear);

            const prevYear = subYears(now, 2);
            prevDateFrom = startOfYear(prevYear);
            prevDateTo = endOfYear(prevYear);
            break;
        case '30d':
            dateFrom = subDays(now, 30);
            prevDateFrom = subDays(now, 60);
            prevDateTo = subDays(now, 30);
            break;
        case '7d':
        default:
            dateFrom = subDays(now, 7);
            prevDateFrom = subDays(now, 14);
            prevDateTo = subDays(now, 7);
            break;
    }

    return {
        dateFrom: format(dateFrom, "yyyy-MM-dd HH:mm:ss"),
        dateTo: format(dateTo, "yyyy-MM-dd HH:mm:ss"),
        prevDateFrom: format(prevDateFrom, "yyyy-MM-dd HH:mm:ss"),
        prevDateTo: format(prevDateTo, "yyyy-MM-dd HH:mm:ss"),
    };
}

export async function getAnalyticsStats(period: AnalyticsPeriod = '7d'): Promise<AnalyticsStats> {
    const { dateFrom, dateTo, prevDateFrom, prevDateTo } = getDateRange(period);

    // Fixed Query: using '$session_id' instead of 'session_id'
    // Also using 'distinct_id' instead of 'person_id' just in case, though person_id often works.
    // '$session_id' is the property name for session ID in PostHog events.
    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
            select
                countIf(event = '$pageview' and timestamp >= toDateTime('${dateFrom}') and timestamp <= toDateTime('${dateTo}')) as views,
                count(distinct if(event = '$pageview' and timestamp >= toDateTime('${dateFrom}') and timestamp <= toDateTime('${dateTo}'), distinct_id, null)) as visitors,
                count(distinct if(event = '$pageview' and timestamp >= toDateTime('${dateFrom}') and timestamp <= toDateTime('${dateTo}'), properties.$session_id, null)) as sessions,
                
                countIf(event = '$pageview' and timestamp >= toDateTime('${prevDateFrom}') and timestamp <= toDateTime('${prevDateTo}')) as prev_views,
                count(distinct if(event = '$pageview' and timestamp >= toDateTime('${prevDateFrom}') and timestamp <= toDateTime('${prevDateTo}'), distinct_id, null)) as prev_visitors,
                count(distinct if(event = '$pageview' and timestamp >= toDateTime('${prevDateFrom}') and timestamp <= toDateTime('${prevDateTo}'), properties.$session_id, null)) as prev_sessions
            from events
            where timestamp >= toDateTime('${prevDateFrom}')
        `
        }
    };

    // Debug Log
    console.log("Analytics: Fetching Stats...", { POSTHOG_HOST, POSTHOG_PROJECT_ID, period, dateFrom, dateTo });

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
        // console.log("Analytics: Stats Data Received:", JSON.stringify(data, null, 2));

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

export async function getAnalyticsTrend(period: AnalyticsPeriod = '7d'): Promise<TrendData[]> {
    const { dateFrom, dateTo } = getDateRange(period);

    // Group by logic depending on period? 
    // For 1 day (today/yesterday), we might want hourly? 
    // For 7d/30d -> daily. 
    // For year -> monthly?

    let groupBy = "toDate(timestamp) as day";
    let orderBy = "day asc";
    // For today/yesterday, let's just stick to daily totals (returns 1 row) or hourly? 
    // User probably wants a chart. A single point chart is boring. 
    // Let's do hourly for short periods.

    let timeSelect = "toDate(timestamp)";
    let formatStr = "MMM dd";

    if (period === 'today' || period === 'yesterday') {
        timeSelect = "toStartOfHour(timestamp)";
        groupBy = `${timeSelect} as t`;
        orderBy = "t asc";
        formatStr = "HH:mm";
    } else if (period === 'last_year') {
        timeSelect = "toStartOfMonth(timestamp)";
        groupBy = `${timeSelect} as t`;
        orderBy = "t asc";
        formatStr = "MMM yyyy";
    } else {
        timeSelect = "toDate(timestamp)";
        groupBy = `${timeSelect} as t`;
        orderBy = "t asc";
    }

    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    ${groupBy},
                    countIf(event = '$pageview') as views,
                    count(distinct distinct_id) as visitors
                from events
                where timestamp >= toDateTime('${dateFrom}') and timestamp <= toDateTime('${dateTo}')
                group by t
                order by ${orderBy}
            `
        }
    };

    console.log("Analytics: Fetching Trend...", { dateFrom, dateTo });

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
            date: format(new Date(row[0]), formatStr),
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

export async function getTopExperiences(limit: number = 5, period: AnalyticsPeriod = '30d'): Promise<TopExperience[]> {
    const { dateFrom, dateTo } = getDateRange(period);

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
                  and timestamp >= toDateTime('${dateFrom}') and timestamp <= toDateTime('${dateTo}')
                  and properties.$current_url like '%/experiences/%'
                  and not (properties.$current_url like '%/admin/%')
                group by properties.$current_url
                order by view_count desc
                limit ${limit}
            `
        }
    };

    // ... rest of function implementation ...
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

export async function getGuideViews(slugs: string[]): Promise<Record<string, number>> {
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
                  and properties.$current_url like '%/guides/%'
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
                const guideIndex = pathParts.indexOf('guides');

                if (guideIndex !== -1 && guideIndex + 1 < pathParts.length) {
                    const slug = pathParts[guideIndex + 1];
                    if (slugs.includes(slug)) {
                        results[slug] = (results[slug] || 0) + count;
                    }
                }
            });
        }
        return results;

    } catch (error) {
        console.error("Analytics: Error fetching guide views", error);
        return {};
    }
}


export async function getRealTimeVisitorMapData(period: '30m' | '24h' | '7d' | '30d' = '30m'): Promise<{
    countries: { country: string; visitors: number }[];
    cities: { name: string; coordinates: [number, number]; visitors: number }[];
}> {
    let interval = '30 minute';
    if (period === '24h') interval = '24 hour';
    else if (period === '7d') interval = '7 day';
    else if (period === '30d') interval = '30 day';

    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    properties.$geoip_country_name,
                    properties.$geoip_city_name,
                    properties.$geoip_latitude,
                    properties.$geoip_longitude,
                    count(distinct distinct_id) as visitor_count
                from events
                where event = '$pageview'
                  and timestamp >= now() - interval ${interval}
                  and properties.$geoip_country_name is not null
                  and properties.$geoip_city_name is not null
                group by
                    properties.$geoip_country_name,
                    properties.$geoip_city_name,
                    properties.$geoip_latitude,
                    properties.$geoip_longitude
                order by visitor_count desc
            `
        }
    };

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query?refresh=true`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(queryPayload),
            next: { revalidate: 0 } // No caching for real-time data
        });

        if (!response.ok) {
            console.error("Analytics: Real-time map data req failed", response.status);
            return { countries: [], cities: [] };
        }

        const data = await response.json();
        if (!data.results) return { countries: [], cities: [] };

        const countryMap = new Map<string, number>();
        const cityList: { name: string; coordinates: [number, number]; visitors: number }[] = [];

        data.results.forEach((row: any) => {
            const country = row[0] as string;
            const city = row[1] as string;
            const lat = Number(row[2]);
            const lng = Number(row[3]);
            const count = Number(row[4]);

            // Aggregate simple country count
            countryMap.set(country, (countryMap.get(country) || 0) + count);

            // Add city data
            cityList.push({
                name: city,
                coordinates: [lng, lat], // GeoJSON uses [lng, lat]
                visitors: count
            });
        });

        // Format country data
        const countries = Array.from(countryMap.entries()).map(([country, visitors]) => ({
            country,
            visitors
        }));

        // Sort cities
        // Limit to top 50 cities to avoid clutter? or just client side limit.
        // Let's return all valid ones.
        const validCities = cityList.filter(c => !isNaN(c.coordinates[0]) && !isNaN(c.coordinates[1]));

        return { countries, cities: validCities };
    } catch (error) {
        console.error("Analytics: Error fetching real-time map data", error);
        return { countries: [], cities: [] };
    }
}

export async function getRealTimeVisitorTimeline(period: '30m' | '24h' | '7d' | '30d' = '30m'): Promise<{ minute: string; count: number }[]> {
    let interval = '35 minute';
    let groupBy = 'toStartOfMinute';

    if (period === '24h') {
        interval = '24 hour';
        groupBy = 'toStartOfHour';
    } else if (period === '7d') {
        interval = '7 day';
        groupBy = 'toStartOfDay';
    } else if (period === '30d') {
        interval = '30 day';
        groupBy = 'toStartOfDay';
    }

    const queryPayload = {
        query: {
            kind: "HogQLQuery",
            query: `
                select
                    ${groupBy}(timestamp) as time_slot,
                    count(distinct distinct_id) as visitor_count
                from events
                where event = '$pageview'
                  and timestamp >= now() - interval ${interval}
                group by time_slot
                order by time_slot asc
            `
        }
    };

    try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query?refresh=true`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(queryPayload),
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error("Analytics: Timeline data req failed", response.status);
            return [];
        }

        const data = await response.json();
        if (!data.results) return [];

        return data.results.map((row: any) => ({
            minute: row[0],
            count: Number(row[1])
        }));
    } catch (error) {
        console.error("Analytics: Error fetching timeline data", error);
        return [];
    }
}

