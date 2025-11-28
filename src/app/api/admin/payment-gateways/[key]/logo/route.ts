import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { saveUploadedFile } from "@/lib/uploads"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, { params }: { params: { key: string } }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "Unsupported content type" }, { status: 400 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 })
  }
  const key = params.key.toLowerCase()

  try {
    const stored = await saveUploadedFile({ file, directory: `settings/payment-gateways/${key}`, maxSizeBytes: 5 * 1024 * 1024 })
    await prisma.paymentGateway.update({ where: { key }, data: { logoUrl: stored.publicPath } })
    return NextResponse.json({ url: stored.publicPath }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to upload file"
    return NextResponse.json({ message }, { status: 400 })
  }
}


