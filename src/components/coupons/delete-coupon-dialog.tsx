"use client"

import { useState } from "react"
import { Trash } from "lucide-react"
import { useRouter } from "next/navigation"

import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { CtaButton } from "@/components/ui/cta-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { deleteCoupon } from "@/app/actions/coupons"

interface Props {
    couponId: string
    couponCode: string
}

export function DeleteCouponDialog({ couponId, couponCode }: Props) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleDelete() {
        setIsLoading(true)
        const res = await deleteCoupon(couponId)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
            return
        }

        setOpen(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <CtaIconButton color="red" size="sm" ariaLabel="Delete">
                    <Trash className="size-4" />
                </CtaIconButton>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Coupon</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete coupon <strong>{couponCode}</strong>? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <CtaButton color="whiteBorder" disabled={isLoading}>
                            Cancel
                        </CtaButton>
                    </DialogClose>
                    <CtaButton
                        color="whiteBorder"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        onClick={handleDelete}
                        isLoading={isLoading}
                    >
                        Delete
                    </CtaButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
