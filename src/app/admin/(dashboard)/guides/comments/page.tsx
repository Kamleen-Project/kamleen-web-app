
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { CheckCircle, XCircle, Trash2, ShieldAlert, MessageSquare } from "lucide-react";

import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getCommentsAdmin, updateCommentStatus, deleteComment } from "@/app/actions/guides";
import { Button } from "@/components/ui/button";

// Only need to import types/enums if used explicitly
// import { CommentStatus } from "@/generated/prisma"; 

export default async function AdminCommentsPage() {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.activeRole !== "ADMIN") return null;

    const comments = await prisma.guideComment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            author: { select: { name: true, image: true, email: true } },
            guide: { select: { title: true, slug: true } },
        },
    });

    return (
        <ConsolePage
            title="Comments Moderation"
            subtitle="Manage user comments on guides."
        >
            <TableContainer>
                <Table minWidth={900}>
                    <TableHeader>
                        <TableHeaderRow>
                            <TableHead>Comment</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Guide</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                        {comments.length === 0 ? (
                            <TableEmpty colSpan={6}>No comments found.</TableEmpty>
                        ) : (
                            comments.map((comment) => (
                                <TableRow key={comment.id}>
                                    <TableCell>
                                        <div className="max-w-[300px] truncate" title={comment.content}>
                                            {comment.content}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{comment.author.name}</span>
                                            <span className="text-xs text-muted-foreground">{comment.author.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/guides/${comment.guide.slug}`} target="_blank" className="text-primary hover:underline max-w-[200px] truncate block">
                                            {comment.guide.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge value={comment.status} variation={
                                            comment.status === "APPROVED" ? "success" :
                                                comment.status === "PENDING" ? "warning" :
                                                    comment.status === "SPAM" ? "danger" :
                                                        "muted"
                                        } />
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">{formatDistanceToNowStrict(comment.createdAt, { addSuffix: true })}</span>
                                    </TableCell>
                                    <TableCell className="px-2 py-2">
                                        <div className="flex items-center gap-1.5">
                                            {comment.status !== "APPROVED" && (
                                                <form action={async () => {
                                                    "use server";
                                                    await updateCommentStatus(comment.id, "APPROVED");
                                                }}>
                                                    <CtaIconButton size="sm" color="whiteBorder" type="submit" ariaLabel="Approve">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    </CtaIconButton>
                                                </form>
                                            )}
                                            {comment.status !== "REJECTED" && (
                                                <form action={async () => {
                                                    "use server";
                                                    await updateCommentStatus(comment.id, "REJECTED");
                                                }}>
                                                    <CtaIconButton size="sm" color="whiteBorder" type="submit" ariaLabel="Reject">
                                                        <XCircle className="h-4 w-4 text-orange-600" />
                                                    </CtaIconButton>
                                                </form>
                                            )}
                                            <form action={async () => {
                                                "use server";
                                                await updateCommentStatus(comment.id, "SPAM");
                                            }}>
                                                <CtaIconButton size="sm" color="whiteBorder" type="submit" ariaLabel="Mark as Spam">
                                                    <ShieldAlert className="h-4 w-4 text-red-600" />
                                                </CtaIconButton>
                                            </form>
                                            <form action={async () => {
                                                "use server";
                                                await deleteComment(comment.id);
                                            }}>
                                                <CtaIconButton size="sm" color="whiteBorder" type="submit" ariaLabel="Delete">
                                                    <Trash2 className="h-4 w-4 text-gray-500" />
                                                </CtaIconButton>
                                            </form>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </ConsolePage>
    );
}
