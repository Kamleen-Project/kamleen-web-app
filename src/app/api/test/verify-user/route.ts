import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  // Guard: only enabled in E2E test runs
  if (process.env.E2E_TESTS !== "true") {
    return NextResponse.json({ message: "Not found" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  let email = ""
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null) as { email?: string } | null
    email = String(body?.email ?? "").trim().toLowerCase()
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null)
    email = String(form?.get("email") ?? "").trim().toLowerCase()
  }

  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return NextResponse.json({ ok: true })

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
  return NextResponse.json({ ok: true })
}


