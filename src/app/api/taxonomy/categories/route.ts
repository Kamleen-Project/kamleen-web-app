import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.experienceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, subtitle: true, picture: true, _count: { select: { experiences: true } } },
  })

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle,
      picture: c.picture,
      experienceCount: c._count.experiences,
    })),
  })
}


