"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OrganizerCouponForm } from "./form"
import { CouponType } from "@/generated/prisma"

interface CouponData {
    id: string
    code: string
    description?: string | null
    discountPercentage: number
    maxReductionAmount?: number | null
    maxUses?: number | null
    validFrom: Date
    expiresAt?: Date | null
    experienceId?: string | null
    type: CouponType
    sessionId?: string | null
}

interface Props {
    experiences: { id: string, title: string }[]
    coupon: CouponData
}

export function OrganizerEditCouponModal({ experiences, coupon }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <CtaIconButton color="whiteBorder" ariaLabel="Edit Coupon" size="sm">
                    <Pencil className="size-4" />
                </CtaIconButton>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Coupon</DialogTitle>
                    <DialogDescription>
                        Update details for coupon {coupon.code}.
                    </DialogDescription>
                </DialogHeader>
                <OrganizerCouponForm
                    experiences={experiences}
                    onSuccess={() => setOpen(false)}
                    initialData={coupon}
                />
            </DialogContent>
        </Dialog>
    )
}
