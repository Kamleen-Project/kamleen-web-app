"use client"

import { useState } from "react"
import { Send, Loader2, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

import { CtaButton } from "@/components/ui/cta-button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { InputField } from "@/components/ui/input-field"
import { TextareaField } from "@/components/ui/textarea-field"
import { useNotifications } from "@/components/providers/notification-provider"
import { createCampaign, sendCampaign, previewNewsletter } from "@/lib/newsletter"

export function SendCampaignModal() {
    const [open, setOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [subject, setSubject] = useState("")
    const [content, setContent] = useState("")
    const [previewHtml, setPreviewHtml] = useState("")
    const { notify } = useNotifications()
    const router = useRouter()

    const handlePreview = async () => {
        if (!subject || !content) {
            notify({ intent: "warning", message: "Please fill in subject and content to preview." })
            return
        }

        setPreviewLoading(true)
        try {
            const res = await previewNewsletter(subject, content)
            if (res.success && res.html) {
                setPreviewHtml(res.html)
                setPreviewOpen(true)
            } else {
                throw new Error(res.message || "Failed to generate preview")
            }
        } catch (error) {
            console.error(error)
            notify({
                intent: "error",
                title: "Preview Error",
                message: error instanceof Error ? error.message : "Something went wrong.",
            })
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subject || !content) {
            notify({ intent: "warning", message: "Please fill in all fields." })
            return
        }

        setLoading(true)
        try {
            // 1. Create Campaign
            const createRes = await createCampaign(subject, content)
            if (!createRes.success || !createRes.campaign) {
                throw new Error(createRes.message || "Failed to create campaign")
            }

            // 2. Send Campaign
            const sendRes = await sendCampaign(createRes.campaign.id)
            if (!sendRes.success) {
                throw new Error(sendRes.message || "Failed to send campaign")
            }

            notify({
                intent: "success",
                title: "Campaign Sent",
                message: `Successfully sent to ${sendRes.sentCount} subscribers.`,
            })
            setOpen(false)
            setSubject("")
            setContent("")
            router.refresh()
        } catch (error) {
            console.error(error)
            notify({
                intent: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Something went wrong.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <CtaButton startIcon={<Send />}>
                        New Campaign
                    </CtaButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Send Newsletter</DialogTitle>
                        <DialogDescription>
                            Create and send a new email campaign to all active subscribers.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSend} className="grid gap-4 py-4">
                        <InputField
                            label="Subject"
                            placeholder="Enter email subject..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />

                        <TextareaField
                            label="Content (HTML supported)"
                            placeholder="<p>Hello world...</p>"
                            className="min-h-[200px] font-mono text-sm"
                            caption="Basic HTML tags are supported for formatting."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <div className="flex flex-1 gap-2">
                                <CtaButton
                                    color="whiteBorder"
                                    onClick={handlePreview}
                                    disabled={previewLoading || loading}
                                    type="button"
                                    isLoading={previewLoading}
                                    startIcon={<Eye />}
                                >
                                    Preview
                                </CtaButton>
                            </div>
                            <CtaButton color="whiteBorder" onClick={() => setOpen(false)} disabled={loading} type="button">
                                Cancel
                            </CtaButton>
                            <CtaButton type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Campaign
                            </CtaButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto border rounded-md p-4 bg-white">
                        <iframe
                            srcDoc={previewHtml}
                            className="w-full h-[500px] border-0"
                            title="Email Preview"
                        />
                    </div>
                    <DialogFooter>
                        <CtaButton onClick={() => setPreviewOpen(false)}>Close Preview</CtaButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
