import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { id } = await params

  await prisma.$transaction([
    prisma.ticketTemplate.updateMany({ data: { isActive: false }, where: { isActive: true } }),
    prisma.ticketTemplate.update({ where: { id }, data: { isActive: true } }),
  ])

  const templates = await prisma.ticketTemplate.findMany({ orderBy: { updatedAt: "desc" } })
  return NextResponse.json({ templates })
}


