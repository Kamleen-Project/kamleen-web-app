import { NextResponse } from 'next/server';

export async function GET() {
    const projectId = process.env.POSTHOG_PROJECT_ID;
    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';

    if (!projectId || !apiKey) {
        console.error('[LiveVisitors] Missing PostHog/API Key');
        return NextResponse.json({ error: 'PostHog configuration missing' }, { status: 500 });
    }

    // Calculate timestamp for "5 minutes ago"
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // 1. Fetch raw events from PostHog API
    const url = `${host}/api/projects/${projectId}/events/?after=${fiveMinutesAgo}&limit=20`;

    console.log(`[LiveVisitors] Fetching from: ${url}`);

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            next: { revalidate: 15 }, // Disable cache for debugging
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('PostHog API Error:', res.status, text);
            throw new Error('Failed to fetch PostHog data');
        }

        const data = await res.json();
        console.log(`[LiveVisitors] Found ${data.results?.length} events`);

        // 2. Extract only the useful data (Privacy filtering)

        // Group by distinct_id to find unique visitors
        const uniqueVisitors = new Set(data.results.map((e: any) => e.distinct_id));

        const recentVisitors = data.results.map((event: any) => ({
            id: event.id,
            city: event.properties?.$geoip_city_name || 'Unknown City',
            country: event.properties?.$geoip_country_name || 'Unknown Country',
            source: event.properties?.$referrer || 'Direct',
            path: event.properties?.$current_url || 'Unknown Path',
            latitude: event.properties?.$geoip_latitude || 0,
            longitude: event.properties?.$geoip_longitude || 0,
            timestamp: event.timestamp,
            event: event.event
        }));

        return NextResponse.json({
            visitors: recentVisitors,
            uniqueCount: uniqueVisitors.size
        });

    } catch (error) {
        console.error('Error in live-visitors route:', error);
        return NextResponse.json({ error: 'Error fetching live data' }, { status: 500 });
    }
}
