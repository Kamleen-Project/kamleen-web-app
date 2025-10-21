import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.activeRole !== "EXPLORER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const count = await prisma.ticket.count({ where: { explorerId: session.user.id, status: "VALID" } });
  return NextResponse.json({ count });
}


