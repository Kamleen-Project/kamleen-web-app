"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { CtaButton } from "@/components/ui/cta-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OrganizerCouponForm } from "./form"

interface Props {
    experiences: { id: string, title: string }[]
}

export function CreateCouponModal({ experiences }: Props) {
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
                        Create a new coupon for your experiences.
                    </DialogDescription>
                </DialogHeader>
                <OrganizerCouponForm
                    experiences={experiences}
                    onSuccess={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
