import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ currency: "USD" })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredCurrency: true },
  })

  const currency = (user?.preferredCurrency || "USD").toUpperCase()
  return NextResponse.json({ currency })
}


