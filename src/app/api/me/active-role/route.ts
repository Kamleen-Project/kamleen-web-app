import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SwitchableRole = "EXPLORER" | "ORGANIZER";

const SWITCHABLE_ROLES = new Set<SwitchableRole>(["EXPLORER", "ORGANIZER"]);

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const rawRole = typeof (body as { activeRole?: unknown }).activeRole === "string" ? (body as { activeRole: string }).activeRole.toUpperCase() : null;

  if (!rawRole || !SWITCHABLE_ROLES.has(rawRole as SwitchableRole)) {
    return NextResponse.json({ message: "Unsupported role" }, { status: 400 });
  }

  const nextRole = rawRole as SwitchableRole;

  if (nextRole === session.user.activeRole) {
    return NextResponse.json({ ok: true, activeRole: nextRole });
  }

  if (nextRole === "ORGANIZER") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizerStatus: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.organizerStatus !== "APPROVED") {
      return NextResponse.json({ message: "Organizer access not approved" }, { status: 403 });
    }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeRole: nextRole },
    });
  } catch (error) {
    return NextResponse.json({ message: "Unable to update active role" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activeRole: nextRole });
}
