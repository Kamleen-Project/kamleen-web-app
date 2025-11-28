import { PrismaClient } from "../src/generated/prisma/index.js"

const DEFAULT_LOGO_URL = "https://i.postimg.cc/3JKR3X1V/logo.png"

const prisma = new PrismaClient()

function baseLayout({ title, preview, bodyHtml }) {
  // Simple, mobile-friendly, inline-style email shell compatible with most clients
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${title}</title>
  <style>
    /* Fallbacks for some clients; most styling is inline */
    .bg { background-color: #f6f7fb !important; }
    .card { background-color: #ffffff !important; border-color: #e5e7eb !important; }
    .text { color: #111827 !important; }
    .muted { color: #6b7280 !important; }
    .btn { background: linear-gradient(135deg,#2563eb,#10b981) !important; color: #ffffff !important; }
    @media (prefers-color-scheme: dark) {
      /* still readable in dark mode clients, but primary is light default */
      .bg { background-color: #111827 !important; }
      .card { background-color: #1f2937 !important; border-color: #374151 !important; }
      .text { color: #f3f4f6 !important; }
      .muted { color: #9ca3af !important; }
      .btn { background: linear-gradient(135deg,#60a5fa,#34d399) !important; color: #0b0b0f !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji, sans-serif;">
  <span class="preheader" style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#f6f7fb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}</span>
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" class="bg" style="background:#f6f7fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:640px;">
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <div style="display:inline-block;height:48px;width:auto;">
                <img src="{{ logoUrl }}" alt="Kamleen" style="height:48px;width:auto;display:block;border:none;outline:none;" />
              </div>
            </td>
          </tr>
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:16px;">
              <p class="muted" style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">You’re receiving this because you have an account on Kamleen.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button({ href, label }) {
  // Centered CTA, pill-shaped, not full width
  return `<div style="text-align:center;margin:12px 0;">
    <a href="${href}" target="_blank" rel="noopener"
      class="btn"
      style="display:inline-block;background:linear-gradient(30deg,#ff512f,#dd2476);color:#ffffff;text-decoration:none;font-weight:600;border-radius:9999px;padding:12px 22px;">
      ${label}
    </a>
  </div>`
}

function escapeText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function templates() {
  const verificationSubject = "Verify your email"
  const verificationHtml = baseLayout({
    title: verificationSubject,
    preview: "Confirm your email to finish signing up",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">Confirm your email</h1>
      <p class="muted" style="margin:0 0 18px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, thanks for joining Kamleen. Please confirm your email address to continue.</p>
      ${button({ href: "{{ actionUrl }}", label: "Verify email" })}
      <p class="muted" style="margin:18px 0 0;font-size:12px;line-height:18px;color:#8791a4;">This link expires in 30 minutes. If you didn’t request this, you can safely ignore this email.</p>
    `,
  })
  const verificationText = `Hi {{ name }},\n\nPlease confirm your email address to continue: {{ actionUrl }}\n\nThis link expires in 30 minutes. If you didn’t request this, ignore this message.`

  const bookingReqSubject = "New booking request"
  const bookingReqHtml = baseLayout({
    title: bookingReqSubject,
    preview: "You’ve received a new booking request",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">New booking request</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Good news — {{ customerName }} requested <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }}.</p>
      <div style="margin:12px 0 18px;padding:12px 14px;border:1px solid #24283a;border-radius:12px;">
        <p class="muted" style="margin:0;font-size:13px;line-height:20px;color:#a3aab8;">Group size: {{ groupSize }} · Total: {{ totalPrice }}</p>
      </div>
      ${button({ href: "{{ dashboardUrl }}", label: "Review request" })}
    `,
  })
  const bookingReqText = `New booking request for {{ experienceTitle }} on {{ sessionDate }}. Group: {{ groupSize }}, Total: {{ totalPrice }}. Review: {{ dashboardUrl }}`

  const bookingConfSubject = "Your booking is confirmed"
  const bookingConfHtml = baseLayout({
    title: bookingConfSubject,
    preview: "Your spot is secured",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">You’re in! Booking confirmed</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, your booking for <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }} is confirmed.</p>
      <div style="margin:12px 0 18px;padding:12px 14px;border:1px solid #24283a;border-radius:12px;">
        <p class="muted" style="margin:0;font-size:13px;line-height:20px;color:#a3aab8;">Meeting point: {{ meetingPoint }} · Host: {{ hostName }}</p>
      </div>
      ${button({ href: "{{ bookingUrl }}", label: "View details" })}
      <p class="muted" style="margin:18px 0 0;font-size:12px;line-height:18px;color:#8791a4;">Need to make changes? You can manage your booking from your dashboard.</p>
    `,
  })
  const bookingConfText = `Hi {{ name }}, your booking for {{ experienceTitle }} on {{ sessionDate }} is confirmed. Meet at {{ meetingPoint }}. Details: {{ bookingUrl }}`

  const organizerNotifSubject = "Organizer booking notification"
  const organizerNotifHtml = baseLayout({
    title: organizerNotifSubject,
    preview: "Summary and next steps for your new booking",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">New booking details</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">You received a booking for <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }}.</p>
      <ul style="margin:0 0 16px;padding-left:18px;color:#a3aab8;">
        <li style="margin-bottom:6px;">Customer: {{ customerName }} ({{ customerEmail }})</li>
        <li style="margin-bottom:6px;">Guests: {{ groupSize }}</li>
        <li style="margin-bottom:6px;">Total: {{ totalPrice }}</li>
      </ul>
      ${button({ href: "{{ dashboardUrl }}", label: "Open dashboard" })}
    `,
  })
  const organizerNotifText = `New booking for {{ experienceTitle }} on {{ sessionDate }}. Customer: {{ customerName }} ({{ customerEmail }}). Guests: {{ groupSize }}, Total: {{ totalPrice }}. Dashboard: {{ dashboardUrl }}`

  const bookingReqExplorerSubject = "We received your reservation request"
  const bookingReqExplorerHtml = baseLayout({
    title: bookingReqExplorerSubject,
    preview: "We’ll notify you when the host confirms",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">Thanks! Your request is in</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, we’ve received your request for <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }}.</p>
      <div style="margin:12px 0 18px;padding:12px 14px;border:1px solid #24283a;border-radius:12px;">
        <p class="muted" style="margin:0;font-size:13px;line-height:20px;color:#a3aab8;">Guests: {{ groupSize }} · Total: {{ totalPrice }}</p>
      </div>
      ${button({ href: "{{ dashboardUrl }}", label: "View request" })}
      <p class="muted" style="margin:18px 0 0;font-size:12px;line-height:18px;color:#8791a4;">You’ll get an email when the host responds. You can manage requests from your dashboard.</p>
    `,
  })
  const bookingReqExplorerText = `Hi {{ name }}, we received your request for {{ experienceTitle }} on {{ sessionDate }}. Guests: {{ groupSize }}, Total: {{ totalPrice }}. View: {{ dashboardUrl }}`

  const bookingCancelledExplorerSubject = "Your reservation was cancelled"
  const bookingCancelledExplorerHtml = baseLayout({
    title: bookingCancelledExplorerSubject,
    preview: "Reservation cancelled",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">Reservation cancelled</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, your reservation for <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }} has been cancelled.</p>
      <div style="margin:12px 0 18px;padding:12px 14px;border:1px solid #24283a;border-radius:12px;">
        <p class="muted" style="margin:0;font-size:13px;line-height:20px;color:#a3aab8;">If this was unexpected, please contact the host.</p>
      </div>
      ${button({ href: "{{ dashboardUrl }}", label: "View reservations" })}
    `,
  })
  const bookingCancelledExplorerText = `Hi {{ name }}, your reservation for {{ experienceTitle }} on {{ sessionDate }} was cancelled. View: {{ dashboardUrl }}`

  const welcomeVerifySubject = "Welcome to Kamleen — Confirm your email"
  const welcomeVerifyHtml = baseLayout({
    title: welcomeVerifySubject,
    preview: "Welcome aboard! Confirm your email to unlock your account.",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">Welcome to Kamleen 🎉</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, we’re excited to have you. First, please confirm your email address to secure your account.</p>
      ${button({ href: "{{ actionUrl }}", label: "Verify email" })}
      <hr style="border:none;border-top:1px solid #2b3042;margin:20px 0;" />
      <p class="muted" style="margin:0 0 12px;font-size:13px;line-height:20px;color:#a3aab8;">Once verified, we’ll guide you through setting up your profile. It takes less than a minute.</p>
    `,
  })
  const welcomeVerifyText = `Welcome to Kamleen!\n\nConfirm your email to get started: {{ actionUrl }}\n\nWe’ll guide you through a quick setup next.`

  const ticketsDeliverySubject = "Your tickets for {{ experienceTitle }}"
  const ticketsDeliveryHtml = baseLayout({
    title: ticketsDeliverySubject,
    preview: "Your tickets are attached as a PDF",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">Here are your tickets</h1>
      <p class="muted" style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3aab8;">Hi {{ name }}, your reservation for <strong style="color:#e5e7eb;">{{ experienceTitle }}</strong> on {{ sessionDate }} is confirmed.</p>
      <div style="margin:12px 0 18px;padding:12px 14px;border:1px solid #24283a;border-radius:12px;">
        <p class="muted" style="margin:0;font-size:13px;line-height:20px;color:#a3aab8;">Your tickets are attached as a PDF. You can also download them from your dashboard.</p>
      </div>
      ${button({ href: "{{ dashboardUrl }}", label: "View reservation" })}
      <p class="muted" style="margin:18px 0 0;font-size:12px;line-height:18px;color:#8791a4;">Please bring a valid ID. Tickets are non-transferable.</p>
    `,
  })
  const ticketsDeliveryText = `Hi {{ name }}, your reservation for {{ experienceTitle }} on {{ sessionDate }} is confirmed. Your tickets are attached as a PDF. View: {{ dashboardUrl }}`

  const newsletterSubject = "{{ subject }}"
  const newsletterHtml = baseLayout({
    title: "{{ title }}",
    preview: "{{ preview }}",
    bodyHtml: `
      <h1 class="text" style="margin:0 0 8px;font-size:22px;line-height:30px;color:#e5e7eb;">{{ title }}</h1>
      <div style="color:#a3aab8;font-size:14px;line-height:22px;">
        {{ bodyHtml }}
      </div>
    `,
  })
  const newsletterText = `{{ title }}\n\n{{ bodyHtml }}`

  return [
    {
      key: "email_verification",
      name: "Email verification",
      category: "ALL",
      subject: verificationSubject,
      html: verificationHtml,
      text: verificationText,
    },
    {
      key: "booking_request",
      name: "Booking request",
      category: "ORGANIZER",
      subject: bookingReqSubject,
      html: bookingReqHtml,
      text: bookingReqText,
    },
    {
      key: "booking_confirmation",
      name: "Booking confirmation",
      category: "EXPLORER",
      subject: bookingConfSubject,
      html: bookingConfHtml,
      text: bookingConfText,
    },
    {
      key: "tickets_delivery",
      name: "Tickets delivery",
      category: "EXPLORER",
      subject: ticketsDeliverySubject,
      html: ticketsDeliveryHtml,
      text: ticketsDeliveryText,
    },
    {
      key: "booking_notification_organizer",
      name: "Organizer booking notification",
      category: "ORGANIZER",
      subject: organizerNotifSubject,
      html: organizerNotifHtml,
      text: organizerNotifText,
    },
    {
      key: "booking_request_explorer",
      name: "Reservation request (explorer)",
      category: "EXPLORER",
      subject: bookingReqExplorerSubject,
      html: bookingReqExplorerHtml,
      text: bookingReqExplorerText,
    },
    {
      key: "booking_cancelled_explorer",
      name: "Reservation cancelled (explorer)",
      category: "EXPLORER",
      subject: bookingCancelledExplorerSubject,
      html: bookingCancelledExplorerHtml,
      text: bookingCancelledExplorerText,
    },
    {
      key: "welcome_verify",
      name: "Welcome + Verify Email",
      category: "ALL",
      subject: welcomeVerifySubject,
      html: welcomeVerifyHtml,
      text: welcomeVerifyText,
    },
    {
      key: "newsletter",
      name: "Newsletter",
      category: "ADMIN",
      subject: newsletterSubject,
      html: newsletterHtml,
      text: newsletterText,
    },
  ]
}

async function upsertTemplates() {
  const list = templates()
  for (const tpl of list) {
    await prisma.emailTemplate.upsert({
      where: { key: tpl.key },
      update: { name: tpl.name, subject: tpl.subject, html: tpl.html, text: tpl.text, logoUrl: DEFAULT_LOGO_URL, category: tpl.category },
      create: { key: tpl.key, name: tpl.name, subject: tpl.subject, html: tpl.html, text: tpl.text, logoUrl: DEFAULT_LOGO_URL, category: tpl.category },
    })
  }
}

async function main() {
  await upsertTemplates()
}

main()
  .then(() => {
    console.log("Seeded email templates successfully.")
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


