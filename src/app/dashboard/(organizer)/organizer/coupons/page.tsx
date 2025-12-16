
import Link from "next/link"
import { Plus, Ticket, Trash } from "lucide-react"

import { ConsolePage } from "@/components/console/page"
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table"
import { CtaButton } from "@/components/ui/cta-button"
import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { StatusBadge } from "@/components/ui/status-badge"
import { getOrganizersCoupons, deleteCoupon } from "@/app/actions/coupons"

import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"
import { formatDistanceToNowStrict } from "date-fns"

import { CreateCouponModal } from "./create-modal"
import { OrganizerEditCouponModal } from "./edit-modal"
import { DeleteCouponDialog } from "@/components/coupons/delete-coupon-dialog"

export default async function OrganizerCouponsPage() {
    const session = await getServerAuthSession()
    if (!session?.user) return <div>Unauthorized</div>

    const [couponsResult, experiences] = await Promise.all([
        getOrganizersCoupons(),
        prisma.experience.findMany({
            where: { organizerId: session.user.id },
            select: { id: true, title: true },
            orderBy: { title: "asc" }
        })
    ])

    if (couponsResult.error || !couponsResult.coupons) {
        return <div>Error loading coupons</div>
    }

    const coupons = couponsResult.coupons
    const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" })

    return (
        <ConsolePage
            title="Coupons"
            subtitle="Manage discounts for your experiences."
            action={<CreateCouponModal experiences={experiences} />}
        >
            <TableContainer>
                <Table minWidth={800}>
                    <TableHeader>
                        <TableHeaderRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Validity</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                        {coupons.length === 0 ? (
                            <TableEmpty colSpan={7}>No coupons found.</TableEmpty>
                        ) : (
                            coupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{coupon.code}</span>
                                            {coupon.description && (
                                                <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">
                                                    {coupon.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{coupon.discountPercentage}%</span>
                                        {coupon.maxReductionAmount && (
                                            <span className="text-xs text-muted-foreground block">Max {coupon.maxReductionAmount}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge value={coupon.type} variation="outline" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{dateFmt.format(new Date(coupon.validFrom))}</span>
                                            {coupon.expiresAt ? (
                                                <span className="text-xs text-muted-foreground">to {dateFmt.format(new Date(coupon.expiresAt))}</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No expiry</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">{coupon.usedCount}</span>
                                            <span className="text-muted-foreground">/ {coupon.maxUses ?? "∞"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {coupon.experience ? (
                                            <div className="flex items-center gap-1 text-sm truncate max-w-[150px]" title={coupon.experience.title}>
                                                <Ticket className="size-3 text-muted-foreground" />
                                                {coupon.experience.title}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <OrganizerEditCouponModal experiences={experiences} coupon={coupon} />
                                            <DeleteCouponDialog couponId={coupon.id} couponCode={coupon.code} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </ConsolePage>
    )
}
