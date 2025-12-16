import { format } from "date-fns";
import { Gamepad2, Pencil, Ticket, Trash, Trophy } from "lucide-react";

import { ConsolePage } from "@/components/console/page";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableEmpty,
    TableHead,
    TableHeader,
    TableHeaderRow,
    TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAllGameEvents } from "@/app/actions/games";
import { getAllCoupons } from "@/app/actions/coupons";
import { AdminCreateGameModal } from "./create-modal";
import { AdminEditGameModal } from "./edit-modal";
import { PreviewGameModal } from "./preview-modal";
import { CtaIconButton } from "@/components/ui/cta-icon-button";

export default async function AdminGamesPage() {
    const [eventsResult, couponsResult] = await Promise.all([
        getAllGameEvents(),
        getAllCoupons()
    ]);

    if (!eventsResult.success || !eventsResult.events) {
        return <div>Error loading game events</div>;
    }

    const coupons = couponsResult.success && couponsResult.coupons
        ? couponsResult.coupons.map(c => ({ id: c.id, code: c.code, description: c.description || "" }))
        : [];

    const events = eventsResult.events;

    return (
        <ConsolePage
            title="Games"
            subtitle="Manage interactive game events and prizes."
            action={<AdminCreateGameModal coupons={coupons} />}
        >
            <TableContainer>
                <Table minWidth={900}>
                    <TableHeader>
                        <TableHeaderRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Prizes</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                        {events.length === 0 ? (
                            <TableEmpty colSpan={6}>No game events found.</TableEmpty>
                        ) : (
                            events.map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{event.title}</span>
                                            {event.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {event.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Gamepad2 className="size-4 text-muted-foreground" />
                                            <span className="capitalize">{event.type.toLowerCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            value={event.isActive ? "ACTIVE" : "INACTIVE"}
                                            variation={event.isActive ? "success" : "muted"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{format(new Date(event.startDate), "MMM dd, yyyy")}</span>
                                            <span className="text-xs text-muted-foreground">to {format(new Date(event.endDate), "MMM dd, yyyy")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1 text-sm font-medium">
                                                <Trophy className="size-3 text-amber-500" />
                                                <span>{event.prizes.length} Prizes</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {event.prizes.slice(0, 3).map(prize => (
                                                    <span key={prize.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                                                        {prize.label || prize.coupon.code} ({(prize.odds * 100).toFixed(0)}%)
                                                    </span>
                                                ))}
                                                {event.prizes.length > 3 && (
                                                    <span className="text-[10px] text-muted-foreground">+{event.prizes.length - 3} more</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {/* Placeholder for Edit/Delete actions */}
                                        <div className="flex items-center gap-1.5">
                                            <PreviewGameModal gameEvent={event} />
                                            <AdminEditGameModal gameEvent={event} coupons={coupons} />
                                            <CtaIconButton color="red" ariaLabel="Delete" size="sm">
                                                <Trash className="size-4" />
                                            </CtaIconButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </ConsolePage>
    );
}
