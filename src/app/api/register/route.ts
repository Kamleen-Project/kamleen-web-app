import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { renderTemplate, sendEmail } from "@/lib/email"
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

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      role: UserRole.EXPLORER,
      activeRole: UserRole.EXPLORER,
      organizerStatus: OrganizerStatus.NOT_APPLIED,
    },
    select: { id: true, name: true, email: true }
  })

  // Create verification token
  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.verificationToken.create({
    data: { identifier: user.email!, token, expires },
  })

  // Render welcome + verify template
  const origin = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0) ? process.env.NEXT_PUBLIC_APP_URL : new URL(request.url).origin
  const verifyUrl = `${origin}/api/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
    user.email!
  )}`
  const rendered = await renderTemplate("welcome_verify", {
    name: user.name ?? "there",
    actionUrl: verifyUrl,
  })
  if (rendered) {
    try {
      await sendEmail({ to: user.email!, subject: rendered.subject, html: rendered.html, text: rendered.text })
    } catch (_) {
      // non-fatal
    }
  }

  return NextResponse.json({ ok: true })
}
