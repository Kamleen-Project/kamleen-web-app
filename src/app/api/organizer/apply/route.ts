import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase()
  let aboutSelf: string | null = null
  let aboutExperience: string | null = null
  let termsAccepted = false

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { organizerAboutSelf?: unknown; organizerAboutExperience?: unknown; organizerTermsAccepted?: unknown }
      | null
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }
    aboutSelf = typeof body.organizerAboutSelf === "string" ? body.organizerAboutSelf.trim() : null
    aboutExperience = typeof body.organizerAboutExperience === "string" ? body.organizerAboutExperience.trim() : null
    termsAccepted = Boolean(body.organizerTermsAccepted)
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    aboutSelf = getOptionalString(formData, "organizerAboutSelf")
    aboutExperience = getOptionalString(formData, "organizerAboutExperience")
    termsAccepted = String(formData.get("organizerTermsAccepted") ?? "false").toLowerCase() === "true"
  } else {
    return NextResponse.json({ message: "Unsupported content type" }, { status: 400 })
  }

  if (!aboutSelf || aboutSelf.length < 30) {
    return NextResponse.json({ message: "Tell us about yourself (min 30 chars)" }, { status: 400 })
  }
  if (!aboutExperience || aboutExperience.length < 30) {
    return NextResponse.json({ message: "Tell us about your experience (min 30 chars)" }, { status: 400 })
  }
  if (!termsAccepted) {
    return NextResponse.json({ message: "Please accept organizer terms" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, organizerStatus: true } })
  if (!user) {
    return NextResponse.json({ message: "Unable to locate your profile. Please sign in again." }, { status: 404 })
  }

  if (user.organizerStatus === "APPROVED") {
    return NextResponse.json({ message: "You are already an approved organizer." }, { status: 400 })
  }

  if (user.organizerStatus === "PENDING") {
    return NextResponse.json({ ok: true, status: "PENDING" })
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        organizerStatus: "PENDING",
        headline: aboutSelf.slice(0, 200),
        bio: aboutExperience.length > 1000 ? aboutExperience.slice(0, 1000) : aboutExperience,
      },
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("[organizer/apply]", error)
    const message = error instanceof Error ? error.message : "Unable to submit organizer request"
    return NextResponse.json({ message }, { status: 500 })
  }
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
