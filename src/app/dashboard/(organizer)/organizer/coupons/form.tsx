"use client"

import { useRouter } from "next/navigation"
import { createCoupon, updateCoupon } from "@/app/actions/coupons"
import { InputField } from "@/components/ui/input-field"
import { SelectField } from "@/components/ui/select-field"
import { TextareaField } from "@/components/ui/textarea-field"
import { PriceInput } from "@/components/ui/price-input"
import { DateField } from "@/components/ui/date-field"
import { CtaButton } from "@/components/ui/cta-button"
import { DialogFooter } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
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
    onSuccess?: () => void
    initialData?: CouponData
}

export function OrganizerCouponForm({ experiences, onSuccess, initialData }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [validFrom, setValidFrom] = useState<Date | undefined>(initialData?.validFrom || new Date())
    const [expiresAt, setExpiresAt] = useState<Date | undefined>(initialData?.expiresAt || undefined)

    // Generate percentage options 5% to 100%
    const percentageOptions = Array.from({ length: 20 }, (_, i) => ({
        value: ((i + 1) * 5).toString(),
        label: `${(i + 1) * 5}% `
    }))

    async function onSubmit(formData: FormData) {
        setIsLoading(true)

        const rawData = {
            code: formData.get("code") as string,
            description: formData.get("description") as string,
            discountPercentage: Number(formData.get("discountPercentage")),
            maxReductionAmount: formData.get("maxReductionAmount") ? Number(formData.get("maxReductionAmount")) : undefined,
            type: CouponType.INTERNAL, // Organizer coupons are INTERNAL by default for now
            maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : undefined,
            validFrom: validFrom || new Date(),
            expiresAt: expiresAt || undefined,
            experienceId: formData.get("experienceId") as string || undefined,
            sessionId: undefined // Not handling session specific via this form yet
        }

        let res
        if (initialData) {
            res = await updateCoupon(initialData.id, rawData)
        } else {
            res = await createCoupon(rawData)
        }

        setIsLoading(false)

        if (res.error) {
            alert(res.error) // Basic error handling
            return
        }

        router.refresh()
        onSuccess?.()
    }

    return (
        <form action={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    id="code"
                    name="code"
                    label="Coupon Code"
                    placeholder="SUMMER2024"
                    required
                    defaultValue={initialData?.code}
                    className="uppercase"
                />
                <SelectField
                    name="type"
                    label="Type"
                    defaultValue={initialData?.type || "INTERNAL"}
                >
                    <option value="INTERNAL">Internal (Owner only)</option>
                    <option value="EXTERNAL">External (Shareable)</option>
                </SelectField>
            </div>

            <TextareaField
                id="description"
                name="description"
                label="Description"
                placeholder="Internal note about this coupon"
                defaultValue={initialData?.description || ""}
            />

            <SelectField
                name="experienceId"
                label="Experience (Optional)"
                caption="Applies to all your experiences if left blank."
                defaultValue={initialData?.experienceId || ""}
            >
                <option value="">All My Experiences (Global)</option>
                {experiences.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                ))}
            </SelectField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                    id="discountPercentage"
                    name="discountPercentage"
                    label="Discount Percentage"
                    required
                    options={percentageOptions}
                    defaultValue={initialData?.discountPercentage?.toString() || "10"}
                />
                <PriceInput
                    id="maxReductionAmount"
                    name="maxReductionAmount"
                    label="Max Reduction Amount"
                    min="0"
                    placeholder="e.g. 50"
                    currency="MAD"
                    defaultValue={initialData?.maxReductionAmount?.toString()}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    id="maxUses"
                    name="maxUses"
                    label="Max Uses (Optional)"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    defaultValue={initialData?.maxUses?.toString()}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DateField
                    id="validFrom"
                    name="validFrom"
                    label="Valid From"
                    required
                    value={validFrom}
                    onChange={setValidFrom}
                    minDate={new Date()}
                />
                <DateField
                    id="expiresAt"
                    name="expiresAt"
                    label="Expires At (Optional)"
                    value={expiresAt}
                    onChange={setExpiresAt}
                    minDate={validFrom || new Date()}
                />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                {/* Cancel button can be handled by DialogClose in parent usually, or we can keep it if we want explicit close */}
                {/* For modal usage, we might want to hide Cancel or make it close the modal. */}
                {/* For now, simplified: Standard Submit */}
                <CtaButton
                    type="submit"
                    isLoading={isLoading}
                    className="w-full md:w-auto"
                >
                    {initialData ? "Update Coupon" : "Create Coupon"}
                </CtaButton>
            </DialogFooter>
        </form>
    )
}

