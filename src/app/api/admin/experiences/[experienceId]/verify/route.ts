import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getServerAuthSession } from "@/lib/auth"

type Payload = { action?: unknown; note?: unknown }

export async function POST(request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.activeRole !== "ADMIN") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 })
  }

  const { experienceId } = await params
  if (!experienceId) return NextResponse.json({ message: "Not found" }, { status: 404 })

  const payload = (await request.json().catch(() => null)) as Payload | null
  if (!payload) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  const action = typeof payload.action === "string" ? payload.action : null
  const note = typeof payload.note === "string" ? payload.note : null

  const experience = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } })
  if (!experience) return NextResponse.json({ message: "Experience not found" }, { status: 404 })

  if (action === "APPROVE") {
    const updated = await prisma.experience.update({
      where: { id: experienceId },
      data: { verificationStatus: "VERIFIED", status: "UNPUBLISHED", verificationNote: null },
      select: { id: true, status: true, verificationStatus: true },
    })
    return NextResponse.json({ ok: true, experience: updated })
  }

  if (action === "REJECT") {
    const updated = await prisma.experience.update({
      where: { id: experienceId },
      data: { verificationStatus: "REJECTED", status: "DRAFT", verificationNote: note ?? "" },
      select: { id: true, status: true, verificationStatus: true, verificationNote: true },
    })
    return NextResponse.json({ ok: true, experience: updated })
  }

  return NextResponse.json({ message: "Unsupported action" }, { status: 400 })
}


