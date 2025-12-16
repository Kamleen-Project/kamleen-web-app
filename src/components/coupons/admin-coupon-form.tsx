"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createCoupon, updateCoupon } from "@/app/actions/coupons"
import { InputField } from "@/components/ui/input-field"
import { SelectField } from "@/components/ui/select-field"
import { TextareaField } from "@/components/ui/textarea-field"
import { PriceInput } from "@/components/ui/price-input"
import { DateField } from "@/components/ui/date-field"
import { CtaButton } from "@/components/ui/cta-button"
import { DialogFooter } from "@/components/ui/dialog"
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

interface AdminCouponFormProps {
    onSuccess?: () => void
    initialData?: CouponData
}

export function AdminCouponForm({ onSuccess, initialData }: AdminCouponFormProps) {
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
            type: CouponType.INTERNAL, // Admin can theoretically create EXTERNAL too, but sticking to INTERNAL default for now unless UI added
            maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : undefined,
            validFrom: validFrom || new Date(),
            expiresAt: expiresAt || undefined,
            // Admin Global Coupon has no experienceId
            experienceId: undefined,
            sessionId: undefined
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
                    label="Code"
                    placeholder="SUMMER2024"
                    required
                    defaultValue={initialData?.code}
                    className="uppercase"
                    caption="Unique alphanumeric code."
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                    id="discountPercentage"
                    name="discountPercentage"
                    label="Discount Percentage"
                    options={percentageOptions}
                    defaultValue={initialData?.discountPercentage?.toString() || "10"}
                />
                <PriceInput
                    id="maxReductionAmount"
                    name="maxReductionAmount"
                    label="Max Reduction Amount"
                    min="0"
                    placeholder="e.g. 50"
                    caption="Maximum amount to deduct."
                    currency="MAD"
                    value={initialData?.maxReductionAmount?.toString()}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    id="maxUses"
                    name="maxUses"
                    label="Max Uses (Global)"
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    defaultValue={initialData?.maxUses?.toString()}
                    caption="Total global uses allowed."
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

            <DialogFooter className="pt-4 border-t">
                <CtaButton type="submit" isLoading={isLoading} className="w-full md:w-auto">
                    {initialData ? "Update Coupon" : "Create Coupon"}
                </CtaButton>
            </DialogFooter>
        </form>
    )
}
