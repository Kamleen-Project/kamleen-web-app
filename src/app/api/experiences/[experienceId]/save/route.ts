import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ saved: false }, { status: 200 });
  }

  const { experienceId } = await params;
  if (!experienceId) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 });
  }

  const found = await prisma.experience.findFirst({
    where: { id: experienceId, savedBy: { some: { id: session.user.id } } },
    select: { id: true },
  });

  return NextResponse.json({ saved: Boolean(found) });
}

export async function POST(_request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const { experienceId } = await params;
  if (!experienceId) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 });
  }

  const experience = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } });
  if (!experience) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 });
  }

  await prisma.experience.update({
    where: { id: experienceId },
    data: {
      savedBy: {
        connect: { id: session.user.id },
      },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ experienceId: string }> }) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const { experienceId } = await params;
  if (!experienceId) {
    return NextResponse.json({ message: "Experience not found" }, { status: 404 });
  }

  await prisma.experience.update({
    where: { id: experienceId },
    data: {
      savedBy: {
        disconnect: { id: session.user.id },
      },
    },
  });

  return NextResponse.json({ ok: true });
}


