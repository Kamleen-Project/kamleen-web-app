import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ organizerStatus: "NOT_APPLIED" })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizerStatus: true },
  })

  return NextResponse.json({ organizerStatus: user?.organizerStatus ?? "NOT_APPLIED" })
}


