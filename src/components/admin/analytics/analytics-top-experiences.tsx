import { Eye } from "lucide-react";
import Link from "next/link";
import { type TopExperience } from "@/app/actions/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AnalyticsTopExperiencesProps {
    data: TopExperience[];
}

export function AnalyticsTopExperiences({ data }: AnalyticsTopExperiencesProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Top Experiences</CardTitle>
                <CardDescription>Most viewed experiences in the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Experience</TableHead>
                            <TableHead>Organizer</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell className="text-center text-muted-foreground h-24">
                                    No views recorded yet.
                                </TableCell>
                                <TableCell>{null}</TableCell>
                                <TableCell>{null}</TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.slug}>
                                    <TableCell className="font-medium">
                                        <Link href={`/experiences/${item.slug}`} className="hover:underline" target="_blank">
                                            {item.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.organizer}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Eye className="h-3 w-3 text-muted-foreground" />
                                            {item.views.toLocaleString()}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
