"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { CtaButton } from "@/components/ui/cta-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AdminCouponForm } from "@/components/coupons/admin-coupon-form"

export function AdminCreateCouponModal() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <CtaButton startIcon={<Plus className="size-4 mr-2" />}>
                    Create Coupon
                </CtaButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create Coupon</DialogTitle>
                    <DialogDescription>
                        Add a new discount code for the platform.
                    </DialogDescription>
                </DialogHeader>
                <AdminCouponForm onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}
