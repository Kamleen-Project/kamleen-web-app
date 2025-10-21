import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json().catch(() => null) as { name?: string; html?: string; isActive?: boolean } | null
  if (!body) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.html === "string") data.html = body.html
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  const tpl = await prisma.ticketTemplate.update({ where: { id }, data })
  return NextResponse.json({ template: tpl })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.ticketTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}


