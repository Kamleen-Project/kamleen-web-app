import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { createRefundForPayment } from "@/lib/payments"

type Payload = {
  paymentId?: unknown
  amount?: unknown
  reason?: unknown
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as Payload | null
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  const paymentId = typeof body.paymentId === "string" ? body.paymentId : null
  const amount = Number.isFinite(body.amount as number) ? (body.amount as number) : NaN
  const reason = typeof body.reason === "string" ? body.reason : undefined
  if (!paymentId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "paymentId and positive amount are required" }, { status: 400 })
  }
  const res = await createRefundForPayment(paymentId, amount, reason)
  return NextResponse.json(res)
}


