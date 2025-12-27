"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { createComment } from "@/app/actions/guides";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";

// Reuse types if possible but for now inline
type Comment = {
    id: string;
    content: string;
    createdAt: Date;
    author: {
        name: string | null;
        image: string | null;
    }
}

export function CommentSection({ guideId, comments }: { guideId: string, comments: Comment[] }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [content, setContent] = useState("");
    const [isPending, startTransition] = useTransition();

    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!session) {
            setAuthMode("login");
            setAuthModalOpen(true);
            return;
        }

        if (!content.trim()) return;

        startTransition(async () => {
            try {
                await createComment(guideId, content);
                toast.success("Comment posted!");
                setContent("");
                router.refresh();
            } catch (error) {
                toast.error("Failed to post comment");
            }
        });
    }

    return (
        <section className="space-y-8 py-8 border-t">
            <h3 className="text-2xl font-bold">Comments ({comments.length})</h3>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="flex gap-4">
                <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted">
                    {session?.user?.image ? (
                        <Image src={session.user.image} alt="You" fill className="object-cover" />
                    ) : (
                        <div className="h-full w-full bg-slate-200" />
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full min-h-[100px] rounded-lg border bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required={!!session}
                    />
                    <div className="flex justify-end">
                        <Button disabled={isPending || (!!session && !content.trim())}>
                            {isPending ? "Posting..." : session ? "Post Comment" : "Sign in to Comment"}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                        <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted">
                            {comment.author.image ? (
                                <Image src={comment.author.image} alt={comment.author.name || "User"} fill className="object-cover" />
                            ) : null}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{comment.author.name || "Anonymous"}</span>
                                <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(comment.createdAt, { addSuffix: true })}</span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed">{comment.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            <AuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                mode={authMode}
                onModeChange={setAuthMode}
            />
        </section>
    );
}
