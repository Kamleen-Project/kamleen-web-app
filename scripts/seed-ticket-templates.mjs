import process from "process"
import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

function defaultHtml() {
  // Simple starter that matches variables our renderer supports
  return `
<div class="ticket">
  <!-- Decorative pattern background -->
  <div style="position:absolute;inset:0;opacity:0.08;background-image:url('{{ patternDataUrl }}');background-size:600px;background-repeat:repeat;"></div>
  <!-- Cover image -->
  <div style="height:120px;width:100%;overflow:hidden;">
    <img alt="cover" src="{{ experienceCoverDataUrl }}" style="height:120px;width:100%;object-fit:cover;display:block;" />
  </div>
  <div style="display:flex;flex-direction:column;height:calc(100% - 120px);padding:24px;box-sizing:border-box;position:relative;">
    <!-- Logo -->
    <div style="margin-top:12px;margin-bottom:12px;">
      <img alt="logo" src="{{ logoDataUrl }}" style="height:54px;width:auto;object-fit:contain;" />
    </div>
    <!-- Gradient band below logo -->
    <div style="height:100px;width:100%;background:linear-gradient(30deg,#ff512f,#dd2476);border-radius:12px;" />

    <!-- Title + organizer -->
    <div style="font-size:22px;font-weight:700;margin-top:16px;">
      {{ experienceTitle }}
    </div>
    <div style="color:#6b7280;margin-top:4px;margin-bottom:12px;">By {{ organizerName }}</div>

    <!-- Date + Time -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <div style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;">
        <!-- clock icon -->
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div>
        <div style="font-size:14px;color:#6b7280;">{{ sessionDate }}</div>
        <div style="display:flex;align-items:baseline;gap:6px;">
          <span style="font-size:18px;font-weight:600;">{{ sessionTimeStart }}</span>
          <span style="font-size:14px;color:#6b7280;">to</span>
          <span style="font-size:14px;">{{ sessionTimeEnd }}</span>
        </div>
      </div>
    </div>

    <!-- Separated date format -->
    <div style="display:flex;gap:8px;color:#6b7280;margin-bottom:12px;">
      <span>{{ sessionWeekday }},</span>
      <span>{{ sessionDay }}</span>
      <span>{{ sessionMonth }}</span>
      <span>{{ sessionYear }}</span>
    </div>

    <!-- Meta grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:16px;">
      <div>
        <div style="font-size:12px;color:#6b7280;">Duration</div>
        <div style="font-weight:600;">{{ sessionDuration }}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#6b7280;">Price</div>
        <div style="font-weight:600;">{{ pricePerSpot }}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#6b7280;">Ticket Number</div>
        <div style="font-weight:600;">{{ code }}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#6b7280;">Seat Number</div>
        <div style="font-weight:600;">{{ seatNumber }}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#6b7280;">Meeting Point</div>
        <div style="font-weight:600;">{{ meetingAddress }}</div>
      </div>
    </div>

    <!-- Explorer + Reservation date -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:12px;color:#6b7280;">Explorer</div>
      <div style="font-weight:600;">{{ explorerName }}</div>
      <div style="font-size:12px;color:#6b7280;">Reservation</div>
      <div style="font-weight:600;">{{ reservationDate }}</div>
    </div>

    <!-- QR + Barcode -->
    <div class="ticket-bottom">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:96px;height:96px;">
          <img alt="qrcode" src="{{ qrcodeDataUrl }}" style="width:96px;height:96px;object-fit:contain;" />
        </div>
        <div style="flex:1;text-align:center">
          <img alt="barcode" src="{{ barcodeDataUrl }}" style="height:56px;width:100%;object-fit:contain;" />
        </div>
      </div>
      <div style="margin-top:16px;color:#6b7280;font-size:12px;text-align:center">
        Please arrive 10 minutes early. Bring a valid ID.
      </div>
    </div>
  </div>
</div>`
}

async function upsertDefaultTemplate() {
  const name = "Default Ticket"
  const html = defaultHtml()
  // Ensure only one active
  await prisma.ticketTemplate.updateMany({ data: { isActive: false }, where: { isActive: true } })
  const existing = await prisma.ticketTemplate.findFirst({ where: { name } })
  if (existing) {
    await prisma.ticketTemplate.update({ where: { id: existing.id }, data: { html, isActive: true } })
  } else {
    await prisma.ticketTemplate.create({ data: { name, html, isActive: true } })
  }
}

async function main() {
  await upsertDefaultTemplate()
}

main()
  .then(() => {
    console.log("Ticket templates seeded")
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


