import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const categoryRaw = url.searchParams.get("category")
  const allowed = new Set(["ADMIN", "EXPLORER", "ORGANIZER", "ALL"]) as Set<string>
  const where = categoryRaw && allowed.has(categoryRaw.toUpperCase())
    ? { category: categoryRaw.toUpperCase() as import("@/generated/prisma").EmailTemplateCategory }
    : undefined

  const templates = await prisma.emailTemplate.findMany({ where, orderBy: { key: "asc" } })
  return NextResponse.json({ templates })
}


