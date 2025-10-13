import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Payload = { experienceId?: unknown }

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }
  if (session.user.activeRole !== "ORGANIZER") {
    return NextResponse.json({ message: "Only organizers can submit experiences for verification." }, { status: 403 })
  }

  const payload = (await request.json().catch(() => null)) as Payload | null
  if (!payload || typeof payload.experienceId !== "string") {
    return NextResponse.json({ message: "experienceId is required" }, { status: 400 })
  }

  const experience = await prisma.experience.findFirst({
    where: { id: payload.experienceId, organizerId: session.user.id },
    select: { id: true, verificationStatus: true },
  })
  if (!experience) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 })
  }

  if (experience.verificationStatus === "PENDING") {
    return NextResponse.json({ message: "Experience is already pending review." }, { status: 409 })
  }

  await prisma.experience.update({
    where: { id: experience.id },
    data: { verificationStatus: "PENDING", verificationNote: null },
    select: { id: true, verificationStatus: true },
  })

  return NextResponse.json({ ok: true })
}


