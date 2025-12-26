"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Globe, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

import { LiveVisitorGlobe } from "./live-visitor-globe";

interface VisitorEvent {
    id: string;
    city: string;
    country: string;
    source: string;
    path: string;
    timestamp: string;
    event: string;
    latitude: number;
    longitude: number;
}

export function LiveVisitorsCard() {
    const [visitors, setVisitors] = useState<VisitorEvent[]>([]);
    const [uniqueCount, setUniqueCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [progress, setProgress] = useState(0);
    const REFRESH_INTERVAL = 15000; // 15 seconds

    const fetchVisitors = async () => {
        try {
            const res = await fetch("/api/analytics/live-visitors");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            if (data.visitors) {
                setVisitors(data.visitors);
                setUniqueCount(data.uniqueCount || 0);
                setLastUpdated(new Date());
                setProgress(0); // Reset progress on successful fetch
            }
        } catch (error) {
            console.error("Error fetching live visitors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
        const interval = setInterval(fetchVisitors, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => Math.min(100, prev + (100 / (REFRESH_INTERVAL / 100))));
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const markers = useMemo(() => {
        return visitors
            .filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number' || (v.latitude && v.longitude))
            .map(v => ({
                location: [Number(v.latitude), Number(v.longitude)] as [number, number],
                size: 0.1
            }))
            .slice(0, 20); // Limit number of markers for performance
    }, [visitors]);

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-medium">
                        Live Visitors
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        in the last 5 minutes
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-tight text-primary">
                                {uniqueCount}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">on site</span>
                        </div>
                    </div>
                    <Progress value={progress} className="h-1 w-[100px]" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-6 flex justify-center items-center overflow-hidden w-[100%] h-[500px]">

                    <LiveVisitorGlobe markers={markers} />
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                    Last updated: {lastUpdated?.toLocaleTimeString()}
                </div>
                <ScrollArea className="h-[200px] w-full pr-4 border rounded-md p-2">
                    {visitors.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                            <Users className="h-8 w-8 mb-2 opacity-20" />
                            <p>No active visitors</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {visitors.map((visitor) => (
                                <div key={visitor.id} className="flex flex-col space-y-1 border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-medium">
                                            <MapPin className="h-3 w-3 text-primary" />
                                            <span className="text-sm">{visitor.city}, {visitor.country}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(visitor.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="ml-5 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">

                                            <Globe className="h-3 w-3" />
                                            <span className="truncate max-w-[250px]">{visitor.source}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">{visitor.event}</span>
                                            <span className="truncate max-w-[250px]">{visitor.path}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>


            </CardContent>
        </Card>
    );
}
