import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")?.trim()
  const email = searchParams.get("email")?.trim()?.toLowerCase()

  if (!token || !email) {
    return NextResponse.redirect(new URL("/onboarding?verified=0", request.url))
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } }).catch(() => null)
  if (!record || record.identifier.toLowerCase() !== email) {
    return NextResponse.redirect(new URL("/onboarding?verified=0", request.url))
  }
  if (record.expires < new Date()) {
    return NextResponse.redirect(new URL("/onboarding?expired=1", request.url))
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, onboardingCompletedAt: true, accountStatus: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL("/onboarding?verified=0", request.url))
  }

  // Derive next status: keep BANNED/ARCHIVED; else ONBOARDING until onboardingCompletedAt is set, then ACTIVE
  const locked = user.accountStatus === "BANNED" || user.accountStatus === "ARCHIVED"
  const nextStatus = locked ? user.accountStatus : user.onboardingCompletedAt ? "ACTIVE" : "ONBOARDING"

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date(), accountStatus: nextStatus } }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return NextResponse.redirect(new URL("/onboarding?verified=1", request.url))
}


