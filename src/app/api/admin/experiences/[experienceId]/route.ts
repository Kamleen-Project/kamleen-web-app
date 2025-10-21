import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ experienceId: string }>
  }
) {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { experienceId } = await params;

  try {
    await prisma.experience.delete({ where: { id: experienceId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to delete experience" }, { status: 500 });
  }
}


