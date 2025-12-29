
import Link from "next/link";
import { Eye, Pencil, Plus, User } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CtaButton } from "@/components/ui/cta-button";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { GuidesActions } from "@/components/admin/guides/guides-actions";
import { createGuide } from "@/app/actions/guides";
import { getGuideViews } from "@/app/actions/analytics";

// Simple pagination for now or reuse existing if generic
// Using Next.js searchParams
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminGuidesPage({ searchParams }: { searchParams: SearchParams }) {
    const session = await getServerAuthSession();
    if (!session?.user || session.user.activeRole !== "ADMIN") return null;

    const resolved = (await searchParams) ?? {};
    const page = Number(resolved.page) || 1;
    const pageSize = 10;

    const guides = await prisma.guide.findMany({
        orderBy: { updatedAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
            author: { select: { name: true, image: true } },
            _count: { select: { comments: true } },
        },
    });

    const slugs = guides.map(g => g.slug);
    const viewCounts = await getGuideViews(slugs);

    const total = await prisma.guide.count();

    return (
        <ConsolePage
            title="Guides"
            subtitle="Manage blog posts and guides."
            action={
                <form action={async () => {
                    "use server";
                    const newGuide = await createGuide({
                        title: "Untitled Guide",
                        slug: `untitled-guide-${Date.now()}`,
                        content: "",
                    });
                    // Client side redirect would be better but this works for server action trigger
                    // Then redirect to edit page
                    const { redirect } = await import("next/navigation");
                    redirect(`/admin/guides/${newGuide.id}`);
                }}>
                    <CtaButton type="submit" color="primary" startIcon={<Plus />} label="New Guide" />
                </form>
            }
        >
            <TableContainer>
                <Table minWidth={900}>
                    <TableHeader>
                        <TableHeaderRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Comments</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                        {guides.length === 0 ? (
                            <TableEmpty colSpan={6}>No guides found.</TableEmpty>
                        ) : (
                            guides.map((guide) => (
                                <TableRow key={guide.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{guide.title}</span>
                                            <span className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>/{guide.slug}</span>
                                                <span className="mx-1 h-3 w-px bg-border" />
                                                <span className="inline-flex items-center gap-1">
                                                    <Eye className="size-3.5" />
                                                    <span>{viewCounts[guide.slug] || 0}</span>
                                                </span>
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {/* Avatar could go here */}
                                            <span>{guide.author.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge value={guide.status} variation={
                                            guide.status === "PUBLISHED" ? "success" :
                                                guide.status === "DRAFT" ? "muted" : "warning"
                                        } />
                                    </TableCell>
                                    <TableCell>
                                        {guide._count.comments}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">{formatDistanceToNowStrict(guide.updatedAt, { addSuffix: true })}</span>
                                    </TableCell>
                                    <TableCell className="px-2 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <CtaIconButton asChild color="whiteBorder" size="md" ariaLabel="Preview">
                                                <Link href={`/guides/${guide.slug}`} target="_blank">
                                                    <Eye />
                                                </Link>
                                            </CtaIconButton>
                                            <CtaIconButton asChild color="whiteBorder" size="md" ariaLabel="Edit">
                                                <Link href={`/admin/guides/${guide.id}`}>
                                                    <Pencil />
                                                </Link>
                                            </CtaIconButton>
                                            <GuidesActions guideId={guide.id} slug={guide.slug} isTrashed={guide.status === "TRASHED"} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {/* Add pagination controls if needed */}
            </TableContainer>
        </ConsolePage>
    );
}
