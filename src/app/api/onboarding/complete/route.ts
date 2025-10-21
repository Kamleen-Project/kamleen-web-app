import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getSafeNextUrl(searchParams: URLSearchParams): string {
  const next = searchParams.get("next");
  if (!next) return "/dashboard";
  try {
    // Only allow same-origin relative paths
    const url = new URL(next, "http://localhost");
    if (url.origin === "http://localhost") return url.pathname + url.search + url.hash;
    return "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export async function GET(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, emailVerified: true, accountStatus: true } });
  if (!current) return NextResponse.redirect(new URL("/login", req.url));
  const locked = current.accountStatus === "BANNED" || current.accountStatus === "ARCHIVED";
  const nextStatus = locked ? current.accountStatus : current.emailVerified ? "ACTIVE" : "ONBOARDING";
  await prisma.user.update({
    where: { id: current.id },
    data: { onboardingCompletedAt: new Date(), accountStatus: nextStatus },
    select: { id: true },
  });

  const nextPath = getSafeNextUrl(new URL(req.url).searchParams);
  return NextResponse.redirect(new URL(nextPath, req.url));
}

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, emailVerified: true, accountStatus: true } });
  if (!current) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  const locked = current.accountStatus === "BANNED" || current.accountStatus === "ARCHIVED";
  const nextStatus = locked ? current.accountStatus : current.emailVerified ? "ACTIVE" : "ONBOARDING";
  await prisma.user.update({
    where: { id: current.id },
    data: { onboardingCompletedAt: new Date(), accountStatus: nextStatus },
    select: { id: true },
  });
  const next = typeof body?.next === "string" ? String(body.next) : "/dashboard";
  return NextResponse.json({ ok: true, next });
}


