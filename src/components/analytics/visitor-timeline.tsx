"use client";

import React, { useMemo } from "react";
import { format, subMinutes, subHours, subDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisitorTimelineProps {
    data: { minute: string; count: number }[];
    period?: '30m' | '24h' | '7d' | '30d';
}

export function VisitorTimeline({ data, period = '30m' }: VisitorTimelineProps) {
    // Generate slots based on period
    const slots = useMemo(() => {
        const now = new Date();
        const timeSlots = [];

        if (period === '30m') {
            const currentMinute = new Date(now.setSeconds(0, 0));
            for (let i = 29; i >= 0; i--) {
                timeSlots.push(subMinutes(currentMinute, i));
            }
        } else if (period === '24h') {
            const currentHour = new Date(now.setMinutes(0, 0, 0));
            for (let i = 23; i >= 0; i--) {
                timeSlots.push(subHours(currentHour, i));
            }
        } else if (period === '7d') {
            const currentDay = new Date(now.setHours(0, 0, 0, 0));
            for (let i = 6; i >= 0; i--) {
                timeSlots.push(subDays(currentDay, i));
            }
        } else if (period === '30d') {
            const currentDay = new Date(now.setHours(0, 0, 0, 0));
            for (let i = 29; i >= 0; i--) {
                timeSlots.push(subDays(currentDay, i));
            }
        }
        return timeSlots;
    }, [period]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                    {period === '30m' ? '30 minutes ago' :
                        period === '24h' ? '24 hours ago' :
                            period === '7d' ? '7 days ago' : '30 days ago'}
                </span>
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                </span>
            </div>

            <div className="flex items-center justify-between gap-1 h-12">
                <TooltipProvider delayDuration={0}>
                    {slots.map((time, index) => {
                        const match = data.find(d => {
                            const dTime = new Date(d.minute);
                            return dTime.getTime() === time.getTime();
                        });

                        const count = match ? match.count : 0;
                        const isActive = count > 0;

                        let formatStr = "HH:mm";
                        if (period === '24h') formatStr = "HH:00";
                        if (period === '7d' || period === '30d') formatStr = "MMM dd";

                        return (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`
                                            flex-1 h-8 rounded-full transition-all duration-300
                                            ${isActive ? "bg-primary/80 hover:bg-primary h-12" : "bg-muted hover:bg-muted/80 h-1"}
                                            min-w-[4px]
                                        `}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <div className="text-xs text-center">
                                        <p className="font-semibold">{format(time, formatStr)}</p>
                                        <p>{count} visitors</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>
        </div>
    );
}
