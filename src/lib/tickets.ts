import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import bwipjs from "bwip-js"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"

export function generateTicketCode(): string {
  const rand = crypto.randomBytes(6).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "")
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase()
  return `T-${ts}-${rand}`
}

export async function generateUniqueTicketCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateTicketCode()
    const found = await prisma.ticket.findUnique({ where: { code } }).catch(() => null)
    if (!found) return code
  }
  throw new Error("Failed to generate unique ticket code")
}

export async function renderBarcodePngBuffer(code: string): Promise<Buffer> {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text: code,
    height: 15,
    scale: 5,
    includetext: true,
    textxalign: "center",
    textyoffset: 12,
  })
}

export async function renderQrPngBuffer(value: string): Promise<Buffer> {
  return await bwipjs.toBuffer({
    bcid: "qrcode",
    text: value,
    scale: 3,
    includetext: false,
  })
}

type TicketPdfContext = {
  experience: {
    title: string
    slug?: string | null
    meetingAddress?: string | null
    location?: string | null
    currency: string
    price?: number | null
    heroImage?: string | null
    organizerName?: string | null
    duration?: string | null
  }
  session: {
    startAt: Date
    meetingAddress?: string | null
    locationLabel?: string | null
    duration?: string | null
    priceOverride?: number | null
  }
  explorer: { name: string | null; email: string | null }
  bookingRef?: string
  reservationDate?: Date | null
}

export async function renderTicketsPdf(
  entries: { code: string; seatNumber: number }[],
  ctx: TicketPdfContext,
): Promise<Buffer> {
  // If an active HTML template exists, render via Node + pdf-lib fallback to current drawing until we add HTML->PDF engine
  const activeTpl = await prisma.ticketTemplate.findFirst({ where: { isActive: true } })
  if (activeTpl) {
    try {
      const html = await buildTicketsHtml(activeTpl.html, entries, ctx)
      const pdf = await renderHtmlToPdf(html)
      if (pdf) return pdf
    } catch {
      // fall through to canvas renderer
    }
  }
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Try to load PNG logo from public/images/logo.png (svg not supported directly by pdf-lib)
  const logoPath = path.resolve(process.cwd(), "public", "images", "logo.png")
  const logoPngBuffer = await fs.readFile(logoPath).catch(() => null as unknown as Buffer | null)
  const logoPng = logoPngBuffer ? await pdf.embedPng(logoPngBuffer).catch(() => null) : null

  for (const entry of entries) {
    const page = pdf.addPage([420, 840]) // Wider slim ticket similar to sample
    const { width, height } = page.getSize()

    const outer = 16
    const cardX = outer
    const cardY = outer
    const cardW = width - outer * 2
    const cardH = height - outer * 2
    const cardPad = 22

    // Card background
    page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: rgb(1, 1, 1) })
    // Left accent bar
    page.drawRectangle({ x: cardX + 6, y: cardY + 10, width: 6, height: cardH - 20, color: rgb(0.37, 0.73, 0.85) })

    // Brand row
    let cursorY = cardY + cardH - cardPad
    const logoY = cursorY - 18
    if (logoPng) {
      const targetH = 24
      const scale = targetH / logoPng.height
      const w = logoPng.width * scale
      const h = logoPng.height * scale
      page.drawImage(logoPng, { x: cardX + cardPad, y: logoY, width: w, height: h })
      page.drawText("Kamleen", { x: cardX + cardPad + w + 8, y: logoY + 2, size: 14, font: fontBold, color: rgb(0.1, 0.12, 0.16) })
    } else {
      page.drawText("Kamleen", { x: cardX + cardPad, y: logoY + 2, size: 16, font: fontBold, color: rgb(0.1, 0.12, 0.16) })
    }

    // Main title and subinfos
    cursorY -= 42
    const contentRight = cardX + cardW - cardPad
    const contentMax = contentRight - (cardX + cardPad)
    page.drawText(ctx.experience.title, { x: cardX + cardPad, y: cursorY, size: 24, font: fontBold, maxWidth: contentMax, color: rgb(0.07, 0.1, 0.18) })

    cursorY -= 8
    const sessionDate = new Date(ctx.session.startAt).toLocaleString()
    page.drawText(sessionDate, { x: cardX + cardPad, y: cursorY - 16, size: 12, font, color: rgb(0.47, 0.51, 0.58) })
    const loc = ctx.session.locationLabel || ctx.experience.meetingAddress || ctx.experience.location || ""
    if (loc) {
      page.drawText(loc, { x: cardX + cardPad, y: cursorY - 34, size: 12, font, color: rgb(0.47, 0.51, 0.58), maxWidth: contentMax })
    }

    // Middle divider
    page.drawRectangle({ x: cardX + cardPad, y: cardY + cardH / 2, width: contentRight - (cardX + cardPad), height: 1, color: rgb(0.89, 0.9, 0.93) })

    // Details grid (2 rows x 3 cols)
    const gridTop = cardY + cardH / 2 - 14
    const gridLeft = cardX + cardPad
    const colW = Math.floor((contentRight - gridLeft) / 3)
    const label = (x: number, y: number, text: string) => page.drawText(text, { x, y, size: 10, font, color: rgb(0.47, 0.51, 0.58) })
    const value = (x: number, y: number, text: string) => page.drawText(text, { x, y, size: 12, font: fontBold, color: rgb(0.13, 0.15, 0.2) })

    const name = ctx.explorer.name || ctx.explorer.email || "Explorer"
    label(gridLeft, gridTop, "Passenger Name")
    value(gridLeft, gridTop - 16, name)

    label(gridLeft + colW, gridTop, "Booking Reference")
    value(gridLeft + colW, gridTop - 16, (ctx.bookingRef || "").slice(0, 10) || "-")

    label(gridLeft + colW * 2, gridTop, "Seat Number")
    value(gridLeft + colW * 2, gridTop - 16, String(entry.seatNumber))

    const gridTop2 = gridTop - 44
    label(gridLeft, gridTop2, "Boarding Time")
    value(gridLeft, gridTop2 - 16, sessionDate)

    label(gridLeft + colW, gridTop2, "Ticket Number")
    value(gridLeft + colW, gridTop2 - 16, entry.code)

    label(gridLeft + colW * 2, gridTop2, "Meeting Point")
    value(gridLeft + colW * 2, gridTop2 - 16, loc || "-")

    // Full-width barcode at the bottom of the ticket content area
    const barcodePng = await renderBarcodePngBuffer(entry.code)
    const barcodeImg = await pdf.embedPng(barcodePng)
    const availableW = (contentRight - (cardX + cardPad))
    const targetW = availableW
    const scale = targetW / barcodeImg.width
    const bw = barcodeImg.width * scale
    const bh = barcodeImg.height * scale
    const bx = cardX + cardPad + (availableW - targetW) / 2
    const by = cardY + 22
    page.drawImage(barcodeImg, { x: bx, y: by, width: bw, height: bh })
  }

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

// Render PDF directly from a provided template HTML string, using the HTML->PDF engine.
export async function renderTicketsPdfFromTemplateHtml(
  templateHtml: string,
  entries: { code: string; seatNumber: number }[],
  ctx: TicketPdfContext,
): Promise<Buffer> {
  const html = await buildTicketsHtml(templateHtml, entries, ctx)
  const pdf = await renderHtmlToPdf(html)
  if (!pdf) {
    throw new Error("HTML->PDF failed for provided template")
  }
  return pdf
}

async function buildTicketsHtml(template: string, entries: { code: string; seatNumber: number }[], ctx: TicketPdfContext): Promise<string> {
  // Load brand logo from public/images/logo.png and expose as data URL
  let logoDataUrl = ""
  let logoWhiteDataUrl = ""
  let patternDataUrl = ""
  try {
    const logoPath = path.resolve(process.cwd(), "public", "images", "logo.png")
    const logoBuf = await fs.readFile(logoPath).catch(() => null as unknown as Buffer | null)
    if (logoBuf) {
      logoDataUrl = `data:image/png;base64,${logoBuf.toString("base64")}`
    }
    const logoWPath = path.resolve(process.cwd(), "public", "images", "logo-w.png")
    const logoWBuf = await fs.readFile(logoWPath).catch(() => null as unknown as Buffer | null)
    if (logoWBuf) {
      logoWhiteDataUrl = `data:image/png;base64,${logoWBuf.toString("base64")}`
    }
    const patternPath = path.resolve(process.cwd(), "public", "images", "pattern.png")
    const patternBuf = await fs.readFile(patternPath).catch(() => null as unknown as Buffer | null)
    if (patternBuf) {
      patternDataUrl = `data:image/png;base64,${patternBuf.toString("base64")}`
    }
  } catch { }

  const brandName = "Kamleen"

  function parseDurationToMinutes(label: string | null | undefined): number {
    if (!label) return 0
    const lower = label.toLowerCase()
    const dMatch = /([0-9]+)\s*d/.exec(lower)
    const hMatch = /([0-9]+)\s*h/.exec(lower)
    const mMatch = /([0-9]+)\s*m/.exec(lower)
    const days = dMatch ? Number.parseInt(dMatch[1] || "0", 10) : 0
    const hours = hMatch ? Number.parseInt(hMatch[1] || "0", 10) : 0
    const minutes = mMatch ? Number.parseInt(mMatch[1] || "0", 10) : 0
    return ((days * 24 + hours) * 60) + minutes
  }

  function formatDateLabel(value: Date): string {
    try {
      const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(value)
      const day = String(value.getDate())
      const month = new Intl.DateTimeFormat("en", { month: "short" }).format(value)
      const year = String(value.getFullYear())
      return `${weekday} ${day} ${month} ${year}`
    } catch {
      return value.toDateString()
    }
  }

  function formatTime(value: Date): string {
    try {
      return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value)
    } catch {
      const hh = String(value.getHours()).padStart(2, "0")
      const mm = String(value.getMinutes()).padStart(2, "0")
      return `${hh}:${mm}`
    }
  }

  function formatDateNoWeekday(value: Date): string {
    try {
      const day = String(value.getDate())
      const month = new Intl.DateTimeFormat("en", { month: "short" }).format(value)
      const year = String(value.getFullYear())
      return `${day} ${month} ${year}`
    } catch {
      return value.toDateString()
    }
  }

  function formatPricePerSpot(amount: number | null | undefined, currency: string): string {
    if (!amount || amount <= 0) return ""
    const cur = (currency || "MAD").toUpperCase()
    const fixed = Number(amount).toFixed(2)
    return `${fixed} ${cur} / Spot`
  }

  const pages: string[] = []
  for (const e of entries) {
    let barcodeDataUrl = ""
    try {
      const png = await renderBarcodePngBuffer(e.code)
      barcodeDataUrl = `data:image/png;base64,${png.toString("base64")}`
    } catch { }

    // Build cover image data URL (supports local public paths and remote URLs)
    let coverDataUrl = ""
    try {
      const candidate = ctx.experience?.heroImage || ""
      const fallbackRel = path.join("images", "placeholder-experience.svg")

      if (candidate && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
        try {
          const res = await fetch(candidate).catch(() => null as unknown as Response | null)
          if (res && res.ok) {
            const arr = await res.arrayBuffer()
            const buf = Buffer.from(arr)
            const contentType = res.headers.get("content-type") || "image/jpeg"
            coverDataUrl = `data:${contentType};base64,${buf.toString("base64")}`
          }
        } catch { }
      }

      if (!coverDataUrl) {
        const sanitized = candidate ? candidate.split("?")[0].split("#")[0] : ""
        const loadRel = sanitized && sanitized.startsWith("/") ? sanitized.slice(1) : sanitized
        const tryPaths = [loadRel, fallbackRel].filter(Boolean)
        for (const p of tryPaths) {
          if (!p) continue
          const abs = path.resolve(process.cwd(), "public", p)
          const buf = await fs.readFile(abs).catch(() => null as unknown as Buffer | null)
          if (buf) {
            const noQueryAbs = abs
            const ext = path.extname(noQueryAbs).toLowerCase()
            const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/svg+xml"
            coverDataUrl = `data:${mime};base64,${buf.toString("base64")}`
            break
          }
        }
      }
    } catch { }

    const sessionStartDate = ctx.session?.startAt ? new Date(ctx.session.startAt) : null
    const totalMinutes = parseDurationToMinutes(ctx.session?.duration ?? ctx.experience?.duration ?? null)
    const sessionEndDate = sessionStartDate && totalMinutes ? new Date(sessionStartDate.getTime() + totalMinutes * 60 * 1000) : null
    const sessionDateLabel = sessionStartDate ? formatDateLabel(sessionStartDate) : ""
    const sessionTimeStart = sessionStartDate ? formatTime(sessionStartDate) : ""
    const sessionTimeEnd = sessionEndDate ? formatTime(sessionEndDate) : ""
    const sessionTimeRange = sessionTimeEnd ? `${sessionTimeStart} to ${sessionTimeEnd}` : sessionTimeStart

    const effectivePrice = (ctx.session?.priceOverride ?? null) != null && (ctx.session?.priceOverride as number | null) !== null
      ? (ctx.session?.priceOverride as number)
      : (ctx.experience?.price ?? null)
    const pricePerSpot = formatPricePerSpot(effectivePrice ?? null, ctx.experience?.currency || "MAD")
    const sessionWeekday = sessionStartDate ? new Intl.DateTimeFormat("en", { weekday: "long" }).format(sessionStartDate) : ""
    const sessionDay = sessionStartDate ? String(sessionStartDate.getDate()) : ""
    const sessionMonth = sessionStartDate ? new Intl.DateTimeFormat("en", { month: "long" }).format(sessionStartDate) : ""
    const sessionYear = sessionStartDate ? String(sessionStartDate.getFullYear()) : ""

    const baseEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://kamleen.com").replace(/\/$/, "")
    const experienceUrl = ctx.experience?.slug
      ? `${baseEnv}/experiences/${ctx.experience.slug}`
      : ""
    let qrcodeDataUrl = ""
    try {
      if (experienceUrl) {
        const png = await renderQrPngBuffer(experienceUrl)
        qrcodeDataUrl = `data:image/png;base64,${png.toString("base64")}`
      }
    } catch { }

    const reservationDateLabel = ctx.reservationDate ? formatDateNoWeekday(new Date(ctx.reservationDate)) : ""

    const variables: Record<string, string> = {
      code: e.code ?? "",
      seatNumber: String(e.seatNumber ?? ""),
      experienceTitle: ctx.experience?.title ?? "",
      meetingAddress: ctx.session?.meetingAddress ?? ctx.experience?.meetingAddress ?? "",
      sessionStart: ctx.session?.startAt ? new Date(ctx.session.startAt).toLocaleString() : "",
      sessionDate: sessionDateLabel,
      sessionTimeStart,
      sessionTimeEnd,
      sessionTimeRange,
      sessionDuration: ctx.session?.duration || ctx.experience?.duration || "",
      sessionWeekday,
      sessionDay,
      sessionMonth,
      sessionYear,
      experienceUrl,
      experienceSlug: ctx.experience?.slug ?? "",
      pricePerSpot,
      organizerName: ctx.experience?.organizerName || "",
      explorerName: ctx.explorer?.name ?? "",
      explorerEmail: ctx.explorer?.email ?? "",
      locationLabel: ctx.session?.locationLabel ?? "",
      bookingRef: ctx.bookingRef ?? "",
      logoDataUrl,
      logoWhiteDataUrl,
      brandName,
      experienceCoverDataUrl: coverDataUrl,
      qrcodeDataUrl,
      reservationDate: reservationDateLabel,
      barcodeDataUrl,
      patternDataUrl,
    }
    const body = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_: string, k: string) => variables[k] ?? "")
    pages.push(`<section class="ticket-page">${body}</section>`)
  }
  // Provide sensible print CSS and fonts
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { --text:#0b0d12; --muted:#6b7280; }
      html, body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--text); }
      /* Remove any default margins from webkit/print engines */
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: 420px 840px; margin: 0; }
      /* Vertical ticket fixed 2:5 aspect */
      .ticket-page { width: 420px; height: 840px; padding: 0; margin: 0; box-sizing: border-box; page-break-after: always; }
      .muted { color: var(--muted); }
      /* Layout helpers available to templates */
      .ticket { display: flex; flex-direction: column; height: 100%; box-sizing: border-box;}
      .ticket-bottom { margin-top: auto; }
    </style>
  </head>
  <body>
    ${pages.join("\n")}
  </body>
</html>`
  return html
}

async function renderHtmlToPdf(html: string): Promise<Buffer | null> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    // Ensure print emulation and fully zero margins with no headers/footers
    await page.emulateMediaType("print")
    const bytes = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    await browser.close()
    return Buffer.from(bytes)
  } catch (e) {
    console.error("[tickets] HTML->PDF failed, falling back to canvas", e)
    // Persist HTML for debugging
    try {
      const tmpPath = path.join(process.cwd(), ".next-cache", `ticket-preview-${Date.now()}.html`)
      await fs.mkdir(path.dirname(tmpPath), { recursive: true })
      await fs.writeFile(tmpPath, html)
    } catch { }
    return null
  }
}

export async function createTicketsForBooking(bookingId: string) {
  const booking = await prisma.experienceBooking.findUnique({
    where: { id: bookingId },
    include: {
      experience: { select: { id: true, title: true, location: true, meetingAddress: true, currency: true } },
      session: { select: { id: true, startAt: true, locationLabel: true, meetingAddress: true } },
      explorer: { select: { id: true, name: true, email: true } },
      tickets: true,
    },
  })
  if (!booking) throw new Error("Booking not found")

  if (booking.tickets.length >= booking.guests) {
    // Already generated
    return booking.tickets
  }

  const toCreate = booking.guests - booking.tickets.length
  const created: { id: string; code: string; seatNumber: number }[] = []
  for (let i = 0; i < toCreate; i++) {
    const code = await generateUniqueTicketCode()
    const seatNumber = booking.tickets.length + i + 1
    const rec = await prisma.ticket.create({
      data: {
        code,
        bookingId: booking.id,
        experienceId: booking.experienceId,
        sessionId: booking.sessionId,
        explorerId: booking.explorerId,
        seatNumber,
      },
      select: { id: true, code: true, seatNumber: true },
    })
    created.push(rec)
  }
  return await prisma.ticket.findMany({ where: { bookingId: booking.id }, orderBy: { seatNumber: "asc" } })
}

export async function buildTicketsPdfForBooking(bookingId: string): Promise<Buffer> {
  const booking = await prisma.experienceBooking.findUnique({
    where: { id: bookingId },
    include: {
      experience: {
        select: {
          title: true,
          slug: true,
          location: true,
          meetingAddress: true,
          currency: true,
          price: true,
          heroImage: true,
          duration: true,
          organizer: { select: { name: true } },
        },
      },
      session: {
        select: {
          startAt: true,
          locationLabel: true,
          meetingAddress: true,
          duration: true,
          priceOverride: true,
        },
      },
      explorer: { select: { name: true, email: true } },
      tickets: { select: { code: true, seatNumber: true } },
    },
  })
  if (!booking) throw new Error("Booking not found")

  // Ensure tickets exist
  if (booking.tickets.length < booking.guests) {
    await createTicketsForBooking(booking.id)
  }

  const fresh = await prisma.experienceBooking.findUnique({
    where: { id: bookingId },
    include: {
      experience: {
        select: {
          title: true,
          slug: true,
          location: true,
          meetingAddress: true,
          currency: true,
          price: true,
          heroImage: true,
          duration: true,
          organizer: { select: { name: true } },
        },
      },
      session: {
        select: {
          startAt: true,
          locationLabel: true,
          meetingAddress: true,
          duration: true,
          priceOverride: true,
        },
      },
      explorer: { select: { name: true, email: true } },
      tickets: { select: { code: true, seatNumber: true }, orderBy: { seatNumber: "asc" } },
    },
  })
  if (!fresh) throw new Error("Booking not found")

  return await renderTicketsPdf(fresh.tickets, {
    experience: {
      title: fresh.experience.title,
      slug: (fresh.experience as { slug?: string | null }).slug ?? null,
      meetingAddress: fresh.experience.meetingAddress,
      location: fresh.experience.location,
      currency: fresh.experience.currency,
      price: (fresh.experience as { price?: number | null }).price ?? null,
      heroImage: (fresh.experience as { heroImage?: string | null }).heroImage ?? null,
      organizerName: (fresh.experience as { organizer?: { name?: string | null } | null }).organizer?.name ?? null,
      duration: (fresh.experience as { duration?: string | null }).duration ?? null,
    },
    session: {
      startAt: (fresh.session as { startAt: Date }).startAt,
      locationLabel: (fresh.session as { locationLabel?: string | null }).locationLabel ?? null,
      meetingAddress: (fresh.session as { meetingAddress?: string | null }).meetingAddress ?? null,
      duration: (fresh.session as { duration?: string | null } | null)?.duration ?? null,
      priceOverride: (fresh.session as { priceOverride?: number | null } | null)?.priceOverride ?? null,
    },
    explorer: { name: fresh.explorer.name, email: fresh.explorer.email },
    reservationDate: (fresh as { createdAt?: Date | string } | null)?.createdAt
      ? new Date(((fresh as { createdAt?: Date | string }).createdAt as Date))
      : new Date(),
    bookingRef: fresh.id,
  })
}


