"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"
import { CouponType, UserRole } from "@/generated/prisma"

// --- Schemas ---

const createCouponSchema = z.object({
    code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, "Code must be alphanumeric (uppercase), dashes or underscores"),
    description: z.string().optional(),
    discountPercentage: z.number().min(1).max(100),
    maxReductionAmount: z.number().min(0).optional(), // Pending minor units confirmation, assuming cents/minor
    type: z.nativeEnum(CouponType).default(CouponType.INTERNAL),
    maxUses: z.number().min(1).optional(),
    validFrom: z.date().default(() => new Date()),
    expiresAt: z.date().optional(),
    experienceId: z.string().optional(),
    sessionId: z.string().optional(),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>

// --- Actions ---

export async function createCoupon(data: CreateCouponInput) {
    const session = await getServerAuthSession()
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "User not found" }

    // Permission check
    const isAdmin = user.role === UserRole.ADMIN
    const isOrganizer = user.role === UserRole.ORGANIZER || user.activeRole === UserRole.ORGANIZER

    if (!isAdmin && !isOrganizer) {
        return { error: "Forbidden: Only Admins and Organizers can create coupons" }
    }

    // Validate input
    const result = createCouponSchema.safeParse(data)
    if (!result.success) {
        return { error: "Validation failed", details: result.error.flatten() }
    }

    const { code, experienceId } = result.data

    // If Organizer, ensure can only link to OWN experience (unless Admin)
    if (!isAdmin && experienceId) {
        const experience = await prisma.experience.findUnique({ where: { id: experienceId } })
        if (!experience || experience.organizerId !== user.id) {
            return { error: "Forbidden: You can only create coupons for your own experiences" }
        }
    }

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({ where: { code } })
    if (existing) {
        return { error: "Coupon code already exists" }
    }

    try {
        const coupon = await prisma.coupon.create({
            data: {
                ...result.data,
                createdById: user.id,
            },
        })

        revalidatePath("/admin/coupons")
        revalidatePath("/dashboard/coupons")
        return { success: true, coupon }
    } catch (err) {
        console.error("Failed to create coupon:", err)
        return { error: "Failed to create coupon" }
    }
}

export async function updateCoupon(couponId: string, data: CreateCouponInput) {
    const session = await getServerAuthSession()
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "User not found" }

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) return { error: "Coupon not found" }

    // Permission check
    const isAdmin = user.role === UserRole.ADMIN
    // Organizer can update their own coupon
    if (!isAdmin && coupon.createdById !== user.id) {
        return { error: "Forbidden" }
    }

    // Validate input
    const result = createCouponSchema.safeParse(data)
    if (!result.success) {
        return { error: "Validation failed", details: result.error.flatten() }
    }

    const { code, experienceId } = result.data

    // If Organizer, ensure can only link to OWN experience (unless Admin)
    if (!isAdmin && experienceId) {
        const experience = await prisma.experience.findUnique({ where: { id: experienceId } })
        if (!experience || experience.organizerId !== user.id) {
            return { error: "Forbidden: You can only create coupons for your own experiences" }
        }
    }

    // Check uniqueness (exclude current coupon)
    const existing = await prisma.coupon.findUnique({ where: { code } })
    if (existing && existing.id !== couponId) {
        return { error: "Coupon code already exists" }
    }

    try {
        const updatedCoupon = await prisma.coupon.update({
            where: { id: couponId },
            data: {
                ...result.data,
            },
        })

        revalidatePath("/admin/coupons")
        revalidatePath("/dashboard/coupons")
        return { success: true, coupon: updatedCoupon }
    } catch (err) {
        console.error("Failed to update coupon:", err)
        return { error: "Failed to update coupon" }
    }
}

export async function deleteCoupon(couponId: string) {
    const session = await getServerAuthSession()
    if (!session || !session.user) return { error: "Unauthorized" }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "User not found" }

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) return { error: "Coupon not found" }

    const isAdmin = user.role === UserRole.ADMIN
    // Organizer can delete their own coupon
    if (!isAdmin && coupon.createdById !== user.id) {
        return { error: "Forbidden" }
    }

    try {
        await prisma.coupon.delete({ where: { id: couponId } })
        revalidatePath("/admin/coupons")
        revalidatePath("/dashboard/coupons")
        return { success: true }
    } catch (err) {
        return { error: "Failed to delete coupon" }
    }
}

export async function getOrganizersCoupons() {
    const session = await getServerAuthSession()
    if (!session || !session.user) return { error: "Unauthorized" }

    const coupons = await prisma.coupon.findMany({
        where: { createdById: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            experience: { select: { title: true } },
        }
    })
    return { success: true, coupons }
}

export async function getAllCoupons() {
    const session = await getServerAuthSession()
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) return { error: "Unauthorized" }

    const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            createdBy: { select: { name: true, email: true } },
            experience: { select: { title: true } },
        }
    })
    return { success: true, coupons }
}

// --- Validation / Application ---

export async function validateCouponForBooking(code: string, experienceId: string, sessionId: string, totalAmount: number) {
    const session = await getServerAuthSession()
    if (!session || !session.user) return { error: "You must be logged in to use a coupon" }

    const coupon = await prisma.coupon.findUnique({
        where: { code },
        include: {
            usages: {
                where: { userId: session.user.id } // check just this user
            }
        }
    })

    if (!coupon) return { error: "Invalid coupon code" }

    // 1. Check Expiry
    const now = new Date()
    if (coupon.validFrom > now) return { error: "Coupon is not yet valid" }
    if (coupon.expiresAt && coupon.expiresAt < now) return { error: "Coupon has expired" }

    // 2. Check Global Max Uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return { error: "Coupon usage limit reached" }
    }

    // 3. Check User limit (One time per user strictly, as per requirement)
    if (coupon.usages.length > 0) {
        return { error: "You have already used this coupon" }
    }

    // 4. Check Scope (Experience / Session)
    if (coupon.experienceId && coupon.experienceId !== experienceId) {
        return { error: "Coupon is not valid for this experience" }
    }
    if (coupon.sessionId && coupon.sessionId !== sessionId) {
        return { error: "Coupon is not valid for this session" }
    }

    // 5. Check Ownership (Internal vs External)
    // "Internal": Organizer created for their own experience. Anyone can use it on THAT experience.
    // "Intern can use from the user owned the coupon , extern type is a sharable coupon so user can share this coupon with someone else to use it , the owner of coupon can't use this coupon in purshaces"
    // Requirement says: "the owner of coupon can't use this coupon in purshaces"
    // Assumption: 'Owner' = Creator.
    if (coupon.createdById === session.user.id) {
        return { error: "You cannot use your own coupon" }
    }

    // Calculate Discount
    let discountAmount = Math.floor((totalAmount * coupon.discountPercentage) / 100)

    // Apply Max Reduction Limit
    if (coupon.maxReductionAmount !== null) {
        discountAmount = Math.min(discountAmount, coupon.maxReductionAmount)
    }

    return {
        success: true,
        discountAmount,
        finalPrice: totalAmount - discountAmount,
        couponId: coupon.id,
        code: coupon.code
    }
}

export async function applyCouponToBooking(bookingId: string, code: string) {
    const session = await getServerAuthSession()
    if (!session || !session.user) return { error: "Unauthorized" }

    const booking = await prisma.experienceBooking.findUnique({
        where: { id: bookingId },
        include: { session: true }
    })

    if (!booking) return { error: "Booking not found" }
    if (booking.explorerId !== session.user.id) return { error: "Unauthorized" }

    // Validate Coupon
    const validation = await validateCouponForBooking(code, booking.experienceId, booking.sessionId, booking.totalPrice)
    if (validation.error || !validation.success || !validation.couponId) {
        return { error: validation.error || "Invalid coupon" }
    }

    try {
        // Transaction: Update Booking Price, Create Usage, Increment Count
        await prisma.$transaction([
            prisma.experienceBooking.update({
                where: { id: bookingId },
                data: { totalPrice: validation.finalPrice }
            }),
            prisma.couponUsage.create({
                data: {
                    bookingId,
                    userId: session.user.id,
                    couponId: validation.couponId
                }
            }),
            prisma.coupon.update({
                where: { id: validation.couponId },
                data: { usedCount: { increment: 1 } }
            })
        ])

        revalidatePath("/dashboard/explorer/reservations")
        return { success: true, newPrice: validation.finalPrice, discountAmount: validation.discountAmount, code: validation.code }
    } catch (err) {
        console.error("Apply coupon error:", err)
        return { error: "Failed to apply coupon" }
    }
}

export async function removeCouponFromBooking(bookingId: string) {
    const session = await getServerAuthSession()
    if (!session || !session.user) return { error: "Unauthorized" }

    const booking = await prisma.experienceBooking.findUnique({
        where: { id: bookingId },
        include: {
            couponUsage: { include: { coupon: true } }
        }
    })

    if (!booking) return { error: "Booking not found" }
    if (booking.explorerId !== session.user.id) return { error: "Unauthorized" }
    if (!booking.couponUsage) return { error: "No coupon applied" }

    const couponId = booking.couponUsage.couponId

    // Recalculate original price based on session strategy.
    const sessionData = await prisma.experienceSession.findUnique({ where: { id: booking.sessionId }, include: { experience: true } })
    const pricePerGuest = sessionData?.priceOverride ?? sessionData?.experience.price ?? 0
    const originalPrice = pricePerGuest * booking.guests

    try {
        await prisma.$transaction([
            prisma.experienceBooking.update({
                where: { id: bookingId },
                data: { totalPrice: originalPrice }
            }),
            prisma.couponUsage.delete({
                where: { bookingId }
            }),
            prisma.coupon.update({
                where: { id: couponId },
                data: { usedCount: { decrement: 1 } }
            })
        ])
        return { success: true, originalPrice }
    } catch (err) {
        return { error: "Failed to remove coupon" }
    }
}

export async function duplicateCoupon(couponId: string) {
    const session = await getServerAuthSession()
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "User not found" }

    const existingCoupon = await prisma.coupon.findUnique({ where: { id: couponId } })
    if (!existingCoupon) return { error: "Coupon not found" }

    // Permission check
    const isAdmin = user.role === UserRole.ADMIN
    if (!isAdmin && existingCoupon.createdById !== user.id) {
        return { error: "Forbidden" }
    }

    // Generate new code
    let newCode = `${existingCoupon.code}-COPY`
    let counter = 1

    // Simple collision avoidance loop (efficient enough for manual duplication)
    while (await prisma.coupon.count({ where: { code: newCode } }) > 0) {
        newCode = `${existingCoupon.code}-COPY-${counter}`
        counter++
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, usedCount, createdById, ...dataToCopy } = existingCoupon

        const newCoupon = await prisma.coupon.create({
            data: {
                ...dataToCopy,
                code: newCode,
                createdById: user.id, // The duplicator becomes the owner (usually same person)
                usedCount: 0, // Reset usage
            },
        })

        revalidatePath("/admin/coupons")
        revalidatePath("/dashboard/coupons")
        return { success: true, coupon: newCoupon }
    } catch (err) {
        console.error("Failed to duplicate coupon:", err)
        return { error: "Failed to duplicate coupon" }
    }
}
