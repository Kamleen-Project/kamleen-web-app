import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { OrganizerStatus, UserRole } from "@/generated/prisma"

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body?.email ?? "").trim().toLowerCase()
  const password = String(body?.password ?? "")
  const name = String(body?.name ?? "").trim()

  if (!email || !password || !name) {
    return NextResponse.json({ message: "Missing required fields." }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Passwords must be at least 8 characters." }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    return NextResponse.json({ message: "That email is already registered." }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      role: UserRole.EXPLORER,
      activeRole: UserRole.EXPLORER,
      organizerStatus: OrganizerStatus.NOT_APPLIED,
    },
  })

  return NextResponse.json({ ok: true })
}
