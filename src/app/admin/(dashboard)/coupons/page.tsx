
import Link from "next/link"
import { Ticket } from "lucide-react"

import { AdminCreateCouponModal } from "./create-modal"
import { AdminEditCouponModal } from "./edit-modal"
import { DeleteCouponDialog } from "@/components/coupons/delete-coupon-dialog"
import { DuplicateCouponButton } from "@/components/coupons/duplicate-coupon-button"
import { formatDistanceToNowStrict } from "date-fns"

import { ConsolePage } from "@/components/console/page"
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table"
import { CtaButton } from "@/components/ui/cta-button"
import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAllCoupons, deleteCoupon } from "@/app/actions/coupons"

export default async function AdminCouponsPage() {
    const result = await getAllCoupons()

    if (result.error || !result.coupons) {
        return <div>Error loading coupons</div>
    }

    const coupons = result.coupons
    const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" })

    return (
        <ConsolePage
            title="Coupons"
            subtitle="Manage discount codes and promotions."
            action={<AdminCreateCouponModal />}
        >
            <TableContainer>
                <Table minWidth={900}>
                    <TableHeader>
                        <TableHeaderRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Validity</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                        {coupons.length === 0 ? (
                            <TableEmpty colSpan={8}>No coupons found.</TableEmpty>
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
                                        ) : coupon.sessionId ? (
                                            <span className="text-muted-foreground">Session Specific</span>
                                        ) : (
                                            <StatusBadge value="GLOBAL" variation="success" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{coupon.createdBy.name}</span>
                                            <span className="text-xs text-muted-foreground">{coupon.createdBy.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <AdminEditCouponModal coupon={coupon} />
                                            <DuplicateCouponButton couponId={coupon.id} />
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
