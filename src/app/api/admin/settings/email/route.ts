import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encryptString } from "@/lib/crypto"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const settings = await prisma.emailSettings.findFirst()
  if (!settings) return NextResponse.json({ settings: null })

  return NextResponse.json({
    settings: {
      id: settings.id,
      provider: settings.provider,
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPasswordMasked: Boolean(settings.smtpPass && settings.smtpPass.length > 0),
      secure: settings.secure,
    },
  })
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData()
    return handleSave(form)
  }

  let json: Record<string, unknown> | null = null
  try {
    json = (await request.json()) as Record<string, unknown>
  } catch {}
  if (!json) return NextResponse.json({ message: "Invalid payload" }, { status: 400 })

  const form = new FormData()
  for (const [k, v] of Object.entries(json)) {
    if (v !== undefined && v !== null) form.append(k, String(v))
  }
  return handleSave(form)
}

async function handleSave(form: FormData) {
  const errors: Record<string, string> = {}

  const provider = getString(form, "provider") || "smtp"
  const fromName = getString(form, "fromName")
  const fromEmail = getString(form, "fromEmail")
  const smtpHost = getString(form, "smtpHost")
  const smtpPort = getNumber(form, "smtpPort", 587)
  const smtpUser = getString(form, "smtpUser")
  const smtpPassword = getOptionalString(form, "smtpPassword")
  const secure = getBoolean(form, "secure", false)

  if (!fromName) errors.fromName = "From name is required"
  if (!fromEmail) errors.fromEmail = "From email is required"
  if (!smtpHost) errors.smtpHost = "SMTP host is required"
  if (!smtpUser) errors.smtpUser = "SMTP user is required"

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 })
  }

  const existing = await prisma.emailSettings.findFirst()

  let smtpPass: string | undefined
  if (smtpPassword) {
    try {
      smtpPass = encryptString(smtpPassword)
    } catch (error) {
      console.error("Failed to encrypt SMTP password", error)
      return NextResponse.json({ message: "Failed to encrypt SMTP password. Verify EMAIL_ENCRYPTION_KEY is set." }, { status: 500 })
    }
  }

  const data = {
    provider,
    fromName: fromName!,
    fromEmail: fromEmail!,
    smtpHost: smtpHost!,
    smtpPort: smtpPort ?? 587,
    smtpUser: smtpUser!,
    secure,
    ...(smtpPass !== undefined ? { smtpPass } : {}),
  }

  let saved
  try {
    saved = existing
      ? await prisma.emailSettings.update({ where: { id: existing.id }, data })
      : await prisma.emailSettings.create({ data: { ...data, smtpPass: smtpPass ?? "" } })
  } catch (error) {
    console.error("Failed to persist email settings", error)
    return NextResponse.json({ message: "Failed to save email settings" }, { status: 500 })
  }

  return NextResponse.json({
    settings: {
      id: saved.id,
      provider: saved.provider,
      fromName: saved.fromName,
      fromEmail: saved.fromEmail,
      smtpHost: saved.smtpHost,
      smtpPort: saved.smtpPort,
      smtpUser: saved.smtpUser,
      smtpPasswordMasked: true,
      secure: saved.secure,
    },
  })
}

function getString(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function getOptionalString(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function getNumber(form: FormData, key: string, fallback?: number) {
  const v = form.get(key)
  if (typeof v !== "string") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function getBoolean(form: FormData, key: string, fallback: boolean) {
  const v = form.get(key)
  if (typeof v !== "string") return fallback
  const t = v.trim().toLowerCase()
  if (t === "true") return true
  if (t === "false") return false
  return fallback
}


