"use server"

import { prisma } from "@/lib/prisma"
import { sendEmail, renderTemplate } from "@/lib/email"
import { revalidatePath } from "next/cache"

export async function subscribeToNewsletter(email: string) {
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    })

    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { isActive: true },
        })
        return { success: true, message: "Welcome back! You've been resubscribed." }
      }
      return { success: true, message: "You are already subscribed." }
    }

    await prisma.newsletterSubscriber.create({
      data: { email },
    })

    return { success: true, message: "Thank you for subscribing!" }
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return { success: false, message: "Failed to subscribe. Please try again." }
  }
}

export async function getSubscribers() {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    })
    return subscribers
  } catch (error) {
    console.error("Failed to fetch subscribers:", error)
    return []
  }
}

export async function getCampaigns() {
  try {
    const campaigns = await prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: "desc" },
    })
    return campaigns
  } catch (error) {
    console.error("Failed to fetch campaigns:", error)
    return []
  }
}

export async function createCampaign(subject: string, content: string) {
  try {
    const campaign = await prisma.newsletterCampaign.create({
      data: {
        subject,
        content,
        status: "DRAFT",
      },
    })
    revalidatePath("/admin/newsletter")
    return { success: true, campaign }
  } catch (error) {
    console.error("Failed to create campaign:", error)
    return { success: false, message: "Failed to create campaign." }
  }
}

export async function sendCampaign(campaignId: string) {
  try {
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) throw new Error("Campaign not found")
    if (campaign.status === "SENT" || campaign.status === "SENDING") {
      return { success: false, message: "Campaign already sent or sending." }
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
    })

    if (subscribers.length === 0) {
      return { success: false, message: "No active subscribers to send to." }
    }

    // Update status to SENDING and set total recipients
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        totalRecipients: subscribers.length,
        processedRecipients: 0,
        recipientCount: 0
      },
    })

    // Render template once
    const rendered = await renderTemplate("newsletter", {
      subject: campaign.subject,
      bodyHtml: campaign.content,
      title: campaign.subject,
      preview: campaign.subject
    })

    if (!rendered) {
      throw new Error("Newsletter template not found")
    }

    // Start async processing (fire and forget)
    processCampaign(campaignId, subscribers, rendered).catch(err => {
      console.error("Background campaign processing failed:", err)
    })

    revalidatePath("/admin/newsletter")
    return { success: true, message: "Campaign sending started.", sentCount: subscribers.length }
  } catch (error) {
    console.error("Failed to initiate campaign:", error)
    return { success: false, message: "Failed to initiate campaign." }
  }
}

async function processCampaign(campaignId: string, subscribers: any[], rendered: any) {
  let sentCount = 0
  const batchSize = 10 // Update progress every 10 emails

  for (let i = 0; i < subscribers.length; i++) {
    const sub = subscribers[i]
    try {
      await sendEmail({
        to: sub.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
      sentCount++
    } catch (e) {
      console.error(`Failed to send to ${sub.email}`, e)
    }

    // Update progress periodically
    if ((i + 1) % batchSize === 0 || i === subscribers.length - 1) {
      await prisma.newsletterCampaign.update({
        where: { id: campaignId },
        data: { processedRecipients: i + 1 }
      })
    }
  }

  // Final update
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      recipientCount: sentCount,
      processedRecipients: subscribers.length
    },
  })

  revalidatePath("/admin/newsletter")
}

export async function previewNewsletter(subject: string, content: string) {
  try {
    const rendered = await renderTemplate("newsletter", {
      subject,
      bodyHtml: content,
      title: subject,
      preview: subject,
    })

    if (!rendered) {
      return { success: false, message: "Newsletter template not found" }
    }

    return { success: true, html: rendered.html }
  } catch (error) {
    console.error("Failed to preview newsletter:", error)
    return { success: false, message: "Failed to generate preview." }
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    await prisma.newsletterCampaign.delete({
      where: { id: campaignId },
    })
    revalidatePath("/admin/newsletter")
    return { success: true, message: "Campaign deleted successfully." }
  } catch (error) {
    console.error("Failed to delete campaign:", error)
    return { success: false, message: "Failed to delete campaign." }
  }
}
