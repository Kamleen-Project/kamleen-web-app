import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const templates = await prisma.ticketTemplate.findMany({ orderBy: { updatedAt: "desc" } })
  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { name?: string; html?: string } | null
  if (!body || !body.name || !body.html) {
    return NextResponse.json({ message: "name and html are required" }, { status: 400 })
  }

  const tpl = await prisma.ticketTemplate.create({ data: { name: body.name.trim(), html: body.html } })
  return NextResponse.json({ template: tpl })
}


