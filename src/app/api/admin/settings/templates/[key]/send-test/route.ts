import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { renderTemplate, sendEmail, getTransport } from "@/lib/email"

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { to?: string } | null
  if (!body || typeof body.to !== "string" || !body.to.trim()) {
    return NextResponse.json({ message: "Recipient email is required" }, { status: 400 })
  }
  const { key } = await params

  const rendered = await renderTemplate(key, { name: session.user.name ?? "Tester" })
  if (!rendered) {
    return NextResponse.json({ message: "Template not found" }, { status: 404 })
  }

  try {
    // Verify SMTP connection/auth first to surface clearer errors to the client
    try {
      const { transporter } = await getTransport()
      await transporter.verify()
    } catch (verifyErr: unknown) {
      const err = verifyErr as { message?: string; code?: string }
      const message = err?.message || "SMTP verification failed"
      const code = err?.code
      return NextResponse.json({ message: code ? `${message} (${code})` : message }, { status: 500 })
    }

    await sendEmail({ to: body.to.trim(), subject: rendered.subject || `Test: ${key}`, html: rendered.html || "<p>No HTML</p>", text: rendered.text })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const err = error as { message?: string; code?: string }
    console.error(error)
    const message = err?.message || "Failed to send test email"
    const code = err?.code
    return NextResponse.json({ message: code ? `${message} (${code})` : message }, { status: 500 })
  }
}


