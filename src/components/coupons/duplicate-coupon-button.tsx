"use client"

import { useState } from "react"
import { Copy } from "lucide-react"
import { useRouter } from "next/navigation"

import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { duplicateCoupon } from "@/app/actions/coupons"

interface Props {
    couponId: string
}

export function DuplicateCouponButton({ couponId }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleDuplicate() {
        setIsLoading(true)
        const res = await duplicateCoupon(couponId)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
            return
        }

        router.refresh()
    }

    return (
        <CtaIconButton
            color="whiteBorder"
            size="sm"
            ariaLabel="Duplicate Coupon"
            onClick={handleDuplicate}
            disabled={isLoading}
        >
            <Copy className="size-4" />
        </CtaIconButton>
    )
}
