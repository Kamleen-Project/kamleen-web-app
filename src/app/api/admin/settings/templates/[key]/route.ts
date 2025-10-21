import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  let form: FormData | null = null
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    form = await request.formData()
  } else {
    try {
      const json = (await request.json()) as Record<string, unknown>
      form = new FormData()
      for (const [k, v] of Object.entries(json)) {
        if (v !== undefined && v !== null) form.append(k, String(v))
      }
    } catch {}
  }
  if (!form) return NextResponse.json({ message: "Invalid payload" }, { status: 400 })

  const { key } = await params
  const name = getString(form, "name")
  const subject = getString(form, "subject")
  const html = getString(form, "html")
  const text = getOptionalString(form, "text")
  const logoUrl = getOptionalString(form, "logoUrl")
  const categoryRaw = getOptionalString(form, "category")
  const allowedCategories = new Set(["ADMIN", "EXPLORER", "ORGANIZER", "ALL"]) as Set<string>
  const category = categoryRaw && allowedCategories.has(categoryRaw.toUpperCase()) ? (categoryRaw.toUpperCase() as import("@/generated/prisma").EmailTemplateCategory) : "ALL"

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required"
  if (!subject) errors.subject = "Subject is required"
  if (!html) errors.html = "HTML is required"
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 })

  // Enforce a sans-serif base font in the HTML body without touching unrelated pages
  const ensureSansSerif = (value: string) => {
    try {
      // If a <body ...> exists, ensure it has a font-family in the inline style
      const bodyTagRegex = /<body(\s+[^>]*?)?>/i
      if (bodyTagRegex.test(value)) {
        return value.replace(bodyTagRegex, (match) => {
          // Extract attributes inside body tag
          const hasStyle = /style=\"[^\"]*\"/i.test(match)
          if (!hasStyle) {
            return match.replace(/>$/, ' style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;">')
          }
          // Add font-family to existing style if not present
          return match.replace(/style=\"([^\"]*)\"/i, (m, styleValue) => {
            if (/font-family\s*:/i.test(styleValue)) return m
            const sep = styleValue.trim().length > 0 && !/;\s*$/.test(styleValue) ? '; ' : ''
            return `style="${styleValue}${sep}font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;"`
          })
        })
      }
      // If no body tag, prepend a minimal wrapper enforcing font
      return `<body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;">${value}</body>`
    } catch {
      return value
    }
  }

  const htmlWithFont = ensureSansSerif(html!)

  const baseData: Pick<import("@/generated/prisma").Prisma.EmailTemplateCreateInput, "name" | "subject" | "html" | "text" | "logoUrl"> = {
    name: name!,
    subject: subject!,
    html: htmlWithFont,
    text: text ?? undefined,
    logoUrl: logoUrl ?? undefined,
  }
  const updateData: import("@/generated/prisma").Prisma.EmailTemplateUpdateInput = { ...baseData, category }
  const createData: import("@/generated/prisma").Prisma.EmailTemplateCreateInput = { key, ...baseData, category }

  const saved = await prisma.emailTemplate.upsert({
    where: { key },
    update: updateData,
    create: createData,
  })

  return NextResponse.json({ template: saved })
}

function getString(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function getOptionalString(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}


