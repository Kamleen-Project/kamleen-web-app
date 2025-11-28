"use client"

import { useState, useEffect } from "react"
import { Mail, Send, Users, Eye, Trash2, Loader2, RefreshCw } from "lucide-react"

import { CtaButton } from "@/components/ui/cta-button"
import { CtaIconButton } from "@/components/ui/cta-icon-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getCampaigns, getSubscribers, deleteCampaign, previewNewsletter } from "@/lib/newsletter"
import { SendCampaignModal } from "@/components/admin/newsletter/send-campaign-modal"
import { useNotifications } from "@/components/providers/notification-provider"
import { useRouter } from "next/navigation"

export default function NewsletterPage() {
    const [subscribers, setSubscribers] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"subscribers" | "campaigns">("subscribers")
    const [refreshing, setRefreshing] = useState(false)

    // View Campaign State
    const [viewOpen, setViewOpen] = useState(false)
    const [viewHtml, setViewHtml] = useState("")
    const [viewSubject, setViewSubject] = useState("")
    const [viewLoading, setViewLoading] = useState(false)

    // Delete Campaign State
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const { notify } = useNotifications()
    const router = useRouter()

    const fetchData = async () => {
        try {
            const [subs, camps] = await Promise.all([getSubscribers(), getCampaigns()])
            setSubscribers(subs)
            setCampaigns(camps)
        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()

        // Auto-refresh if any campaign is sending
        const interval = setInterval(() => {
            setCampaigns(prev => {
                const hasSending = prev.some(c => c.status === "SENDING")
                if (hasSending) {
                    fetchData()
                }
                return prev
            })
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const handleView = async (campaign: any) => {
        setViewSubject(campaign.subject)
        setViewLoading(true)
        setViewOpen(true)
        try {
            // We use the preview action to render the stored content
            const res = await previewNewsletter(campaign.subject, campaign.content)
            if (res.success && res.html) {
                setViewHtml(res.html)
            } else {
                throw new Error(res.message || "Failed to load campaign content")
            }
        } catch (error) {
            console.error(error)
            notify({
                intent: "error",
                title: "Error",
                message: "Could not load email content.",
            })
            setViewOpen(false)
        } finally {
            setViewLoading(false)
        }
    }

    const confirmDelete = (id: string) => {
        setCampaignToDelete(id)
        setDeleteOpen(true)
    }

    const handleDelete = async () => {
        if (!campaignToDelete) return

        setDeleteLoading(true)
        try {
            const res = await deleteCampaign(campaignToDelete)
            if (res.success) {
                notify({ intent: "success", message: res.message })
                setCampaigns(campaigns.filter(c => c.id !== campaignToDelete))
                setDeleteOpen(false)
                setCampaignToDelete(null)
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            notify({
                intent: "error",
                title: "Error",
                message: error instanceof Error ? error.message : "Failed to delete campaign",
            })
        } finally {
            setDeleteLoading(false)
        }
    }

    if (loading) return <div className="p-6">Loading...</div>

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
                    <p className="text-muted-foreground">Manage subscribers and send email campaigns.</p>
                </div>
                <div className="flex gap-2">
                    <CtaIconButton onClick={handleRefresh} ariaLabel="Refresh" isLoading={refreshing} color="whiteBorder">
                        <RefreshCw className="h-4 w-4" />
                    </CtaIconButton>
                    <SendCampaignModal />
                </div>
            </div>


            <div className="space-y-4">
                <div className="flex space-x-2 border-b">
                    <button
                        onClick={() => setActiveTab("subscribers")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "subscribers"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Subscribers ({subscribers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("campaigns")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "campaigns"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Campaigns ({campaigns.length})
                    </button>
                </div>

                {activeTab === "subscribers" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscriber List</CardTitle>
                            <CardDescription>Manage your newsletter audience.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-4 text-left font-medium">Email</th>
                                            <th className="p-4 text-left font-medium">Status</th>
                                            <th className="p-4 text-left font-medium">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subscribers.map((sub) => (
                                            <tr key={sub.id} className="border-b last:border-0">
                                                <td className="p-4">{sub.email}</td>
                                                <td className="p-4">
                                                    <Badge variant={sub.isActive ? "default" : "soft"}>
                                                        {sub.isActive ? "Active" : "Unsubscribed"}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-muted-foreground">
                                                    {new Date(sub.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {subscribers.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                                    No subscribers yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "campaigns" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign History</CardTitle>
                            <CardDescription>View past newsletters and their performance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-4 text-left font-medium">Subject</th>
                                            <th className="p-4 text-left font-medium">Status</th>
                                            <th className="p-4 text-left font-medium">Recipients</th>
                                            <th className="p-4 text-left font-medium">Sent Date</th>
                                            <th className="p-4 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.map((campaign) => (
                                            <tr key={campaign.id} className="border-b last:border-0">
                                                <td className="p-4 font-medium">{campaign.subject}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <Badge
                                                            variant={
                                                                campaign.status === "SENT"
                                                                    ? "default"
                                                                    : campaign.status === "FAILED"
                                                                        ? "default"
                                                                        : "soft"
                                                            }
                                                            className={campaign.status === "FAILED" ? "bg-red-500" : ""}
                                                        >
                                                            {campaign.status}
                                                        </Badge>
                                                        {campaign.status === "SENDING" && (
                                                            <div className="w-24">
                                                                <Progress value={(campaign.processedRecipients / (campaign.totalRecipients || 1)) * 100} className="h-1.5" />
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {Math.round((campaign.processedRecipients / (campaign.totalRecipients || 1)) * 100)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {campaign.status === "SENDING"
                                                        ? `${campaign.processedRecipients} / ${campaign.totalRecipients}`
                                                        : campaign.recipientCount
                                                    }
                                                </td>
                                                <td className="p-4 text-muted-foreground">
                                                    {campaign.sentAt
                                                        ? new Date(campaign.sentAt).toLocaleDateString()
                                                        : "-"}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <CtaIconButton
                                                            size="sm"
                                                            color="whiteBorder"
                                                            onClick={() => handleView(campaign)}
                                                            ariaLabel="View Campaign"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </CtaIconButton>
                                                        <CtaIconButton
                                                            size="sm"
                                                            color="whiteBorder"
                                                            onClick={() => confirmDelete(campaign.id)}
                                                            ariaLabel="Delete Campaign"
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </CtaIconButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {campaigns.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                    No campaigns sent yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* View Modal */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{viewSubject}</DialogTitle>
                        <DialogDescription>Campaign Preview</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto border rounded-md p-4 bg-white min-h-[400px]">
                        {viewLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <iframe
                                srcDoc={viewHtml}
                                className="w-full h-full min-h-[400px] border-0"
                                title="Email Preview"
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <CtaButton onClick={() => setViewOpen(false)}>Close</CtaButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Campaign</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this campaign? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <CtaButton color="whiteBorder" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                            Cancel
                        </CtaButton>
                        <CtaButton
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </CtaButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
