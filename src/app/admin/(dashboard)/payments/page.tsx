import { redirect } from "next/navigation";

import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyButton } from "@/components/ui/copy-button";

export default async function AdminPaymentsPage() {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.role !== "ADMIN") {
		redirect("/admin/login?error=forbidden");
	}

	const payments = await prisma.payment.findMany({
		take: 50,
		orderBy: { createdAt: "desc" },
		include: {
			booking: {
				select: {
					id: true,
					status: true,
					totalPrice: true,
					experience: { select: { title: true } },
					explorer: { select: { name: true, email: true } },
				},
			},
		},
	});

	return (
		<ConsolePage title="Payments" subtitle="Recent transactions across the platform.">
			<TableContainer>
				<Table minWidth={900}>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Created</TableHead>
							<TableHead>Provider</TableHead>
							<TableHead>Status</TableHead>
							<TableHead align="right">Amount</TableHead>
						<TableHead>Booking ID</TableHead>
						<TableHead>Booking Status</TableHead>
							<TableHead>Explorer</TableHead>
							<TableHead>Experience</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
					{payments.length === 0 ? (
						<TableEmpty colSpan={8}>No payments found.</TableEmpty>
						) : (
							payments.map((p) => (
								<TableRow key={p.id}>
									<TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
									<TableCell>{p.provider}</TableCell>
								<TableCell>
									<StatusBadge value={formatLabel(p.status)} variation={mapPaymentVariation(p.status)} />
								</TableCell>
								<TableCell align="right">{(p.amount / 100).toFixed(2)} {p.currency}</TableCell>
								<TableCell>
									<div className="flex items-center gap-1.5">
										<span className="font-mono text-xs">{p.booking.id.slice(0, 10)}...</span>
										<CopyButton text={p.booking.id} ariaLabel="Copy booking id" />
									</div>
								</TableCell>
								<TableCell>
									<StatusBadge value={formatLabel(p.booking.status)} variation={mapBookingVariation(p.booking.status)} />
								</TableCell>
									<TableCell>{p.booking.explorer.name ?? p.booking.explorer.email}</TableCell>
									<TableCell>{p.booking.experience.title}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</ConsolePage>
	);
}

function formatLabel(value: string): string {
	return value.toLowerCase().replace(/_/g, " ");
}

function mapPaymentVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" {
	if (value === "SUCCEEDED" || value === "COMPLETED" || value === "PAID") return "success";
	if (value === "PENDING" || value === "PROCESSING" || value === "REQUIRES_ACTION") return "warning";
	if (value === "FAILED" || value === "CANCELED" || value === "CANCELLED" || value === "REFUNDED" || value === "CHARGEBACK") return "danger";
	if (value === "EXPIRED") return "muted";
	return "outline";
}

function mapBookingVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" | "soft" {
	if (value === "CONFIRMED" || value === "COMPLETED") return "success";
	if (value === "PENDING" || value === "PROCESSING") return "warning";
	if (value === "CANCELLED" || value === "CANCELED" || value === "REJECTED") return "danger";
	if (value === "EXPIRED") return "muted";
	if (value === "ON_HOLD") return "soft";
	return "outline";
}
