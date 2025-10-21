import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { renderTemplate, sendEmail } from "@/lib/email"

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const email = (form?.get("email") || "") as string
  const normalized = String(email ?? "").trim().toLowerCase()
  if (!normalized) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, name: true, email: true, emailVerified: true } })
  if (!user) return NextResponse.json({ ok: true })
  if (user.emailVerified) return NextResponse.json({ ok: true })

  // Clear existing tokens for this identifier
  await prisma.verificationToken.deleteMany({ where: { identifier: normalized } })

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.verificationToken.create({ data: { identifier: normalized, token, expires } })

  const origin = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0) ? process.env.NEXT_PUBLIC_APP_URL : new URL(request.url).origin
  const verifyUrl = `${origin}/api/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalized)}`
  const rendered = await renderTemplate("welcome_verify", { name: user.name ?? "there", actionUrl: verifyUrl })
  if (rendered) {
    try {
      await sendEmail({ to: normalized, subject: rendered.subject, html: rendered.html, text: rendered.text })
    } catch (_) {}
  }

  return NextResponse.json({ ok: true })
}


