import nodemailer from "nodemailer"

import { prisma } from "@/lib/prisma"
import { decryptString } from "@/lib/crypto"

export async function getTransport() {
  const settings = await prisma.emailSettings.findFirst()
  if (!settings) throw new Error("Email settings not configured")

  const smtpPass = settings.smtpPass ? decryptString(settings.smtpPass) : ""

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.secure,
      auth: {
        user: settings.smtpUser,
        pass: smtpPass,
      },
    })

    // Verify connection (non-fatal in prod path, used for debugging)
    try {
      await transporter.verify()
    } catch (e) {
      console.error("[email] transporter.verify failed", e)
    }

    return { transporter, from: { name: settings.fromName, address: settings.fromEmail } }
  } catch (e) {
    console.error("[email] failed to create transporter", {
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.secure,
      user: settings.smtpUser,
    })
    throw e
  }
}

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; text?: string; attachments?: { filename: string; content: Buffer; contentType?: string }[] }) {
  const { transporter, from } = await getTransport()
  try {
    const info = await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text, attachments: opts.attachments })
    return info
  } catch (e) {
    console.error("[email] sendMail error", e)
    throw e
  }
}

export async function renderTemplate(key: string, variables: Record<string, string | number> = {}) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { key } })
  if (!tpl) return null
  // Add default logo variables: prefer template.logoUrl, else fallback to a public brand asset
  const defaultLogoUrl = (tpl as unknown as { logoUrl?: string | null }).logoUrl || "/globe.svg"
  const mergedVars: Record<string, string | number> = {
    logoUrl: defaultLogoUrl,
    ...variables,
  }
  // Minimal variable interpolation: {{ name }}
  const interpolate = (input: string | null | undefined) => {
    if (!input) return null
    return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(mergedVars[k] ?? ""))
  }
  return {
    subject: interpolate(tpl.subject) ?? "",
    html: interpolate(tpl.html) ?? "",
    text: interpolate(tpl.text ?? "") ?? undefined,
  }
}


