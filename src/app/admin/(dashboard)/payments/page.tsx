import { redirect } from "next/navigation";
import { ConsolePage } from "@/components/console/page";
import { Table, TableBody, TableCell, TableContainer, TableEmpty, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, $Enums } from "@/generated/prisma";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkPaidButton } from "@/components/admin/bookings/mark-paid-button";
import { PaymentInfoButton } from "@/components/admin/bookings/payment-info-button";
import { BookingInfoButton } from "@/components/admin/bookings/booking-info-button";
import { BookingsFilters } from "@/components/admin/bookings/filters";
import { BookingsPagination } from "@/components/admin/bookings-pagination";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
	const session = await getServerAuthSession();
	if (!session?.user || session.user.role !== "ADMIN") {
		redirect("/admin/login?error=forbidden");
	}

	const resolved = (await searchParams) ?? {};
	const statusQuery = normalizeStringParam(resolved["status"]) ?? "__ALL__";
	const paymentStatusQuery = normalizeStringParam(resolved["paymentStatus"]) ?? "__ALL__";
	const q = normalizeStringParam(resolved["q"])?.trim() || null;
	const page = normalizeNumberParam(resolved["page"], 1);
	const pageSize = clampPageSize(normalizeNumberParam(resolved["pageSize"], 10));

	const where: Prisma.ExperienceBookingWhereInput = {
		...(statusQuery !== "__ALL__" ? { status: statusQuery as $Enums.ExperienceBookingStatus } : {}),
		...(paymentStatusQuery !== "__ALL__" ? { paymentStatus: paymentStatusQuery as $Enums.PaymentStatus } : {}),
		...(q
			? {
					OR: [
						{ id: { contains: q, mode: "insensitive" } },
						{ experience: { title: { contains: q, mode: "insensitive" } } as unknown as Prisma.ExperienceWhereInput },
						{
							explorer: {
								OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
							} as unknown as Prisma.UserWhereInput,
						},
						{ payment: { is: { OR: [{ providerPaymentId: { contains: q, mode: "insensitive" } }, { id: { contains: q, mode: "insensitive" } }] } } },
					],
			  }
			: {}),
	};

	const total = await prisma.experienceBooking.count({ where });

	const bookings = await prisma.experienceBooking.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: pageSize,
		skip: (page - 1) * pageSize,
		include: {
			experience: { select: { title: true, currency: true, organizer: { select: { name: true, email: true } } } },
			explorer: { select: { name: true, email: true } },
			session: { select: { startAt: true, duration: true, locationLabel: true, meetingAddress: true } },
			payment: {
				select: {
					id: true,
					provider: true,
					providerPaymentId: true,
					status: true,
					amount: true,
					currency: true,
					receiptUrl: true,
					errorCode: true,
					errorMessage: true,
					createdAt: true,
					capturedAt: true,
					refundedAt: true,
					refundedAmount: true,
				},
			},
		},
	});

	return (
		<ConsolePage
			title="Payments"
			subtitle="Manage experience reservations."
			action={
				<BookingsFilters
					initialStatus={statusQuery}
					initialPaymentStatus={paymentStatusQuery}
					initialQuery={normalizeStringParam(resolved["q"]) ?? null}
					initialPageSize={pageSize}
				/>
			}
		>
			<TableContainer>
				<Table minWidth={1000}>
					<TableHeader>
						<TableHeaderRow>
							<TableHead>Created</TableHead>
							<TableHead>Booking Details</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Payment</TableHead>
							<TableHead align="right">Total</TableHead>
							<TableHead align="right">Actions</TableHead>
						</TableHeaderRow>
					</TableHeader>
					<TableBody>
						{bookings.length === 0 ? (
							<TableEmpty colSpan={6}>No bookings found.</TableEmpty>
						) : (
							bookings.map((b) => (
								<TableRow key={b.id}>
									<TableCell className="whitespace-nowrap text-xs">
										{new Date(b.createdAt).toLocaleString("en-GB", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
										})}
										<br />
										{new Date(b.createdAt).toLocaleString("en-GB", {
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
											hour12: false,
										})}
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<span className="font-medium">{b.experience.title}</span>
											<div className="text-xs text-muted-foreground">
												{b.explorer.name} • {b.explorer.email}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<StatusBadge value={formatLabel(b.status)} variation={mapBookingVariation(b.status)} />
									</TableCell>
									<TableCell>
										<div className="flex items-center justify-between gap-2">
											{b.paymentStatus ? (
												<StatusBadge value={formatLabel(b.paymentStatus)} variation={mapPaymentVariation(b.paymentStatus)} />
											) : (
												<span className="text-xs text-muted-foreground">-</span>
											)}
											{b.payment ? <PaymentInfoButton payment={b.payment as any} /> : null}
										</div>
									</TableCell>
									<TableCell align="right">
										{b.totalPrice.toFixed(2)} {b.experience.currency}
									</TableCell>
									<TableCell align="right">
										<div className="flex items-center justify-end gap-2">
											<BookingInfoButton booking={b as any} />
											{b.status === "PENDING" && b.paymentStatus === "PROCESSING" ? <MarkPaidButton bookingId={b.id} /> : null}
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				<BookingsPagination page={page} pageSize={pageSize} total={total} />
			</TableContainer>
		</ConsolePage>
	);
}

function normalizeStringParam(value: string | string[] | undefined): string | null {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
	return null;
}

function normalizeNumberParam(value: string | string[] | undefined, fallback: number): number {
	const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampPageSize(size: number): number {
	if (size <= 10) return 10;
	if (size <= 20) return 20;
	return 50;
}

function formatLabel(value: string): string {
	return value.toLowerCase().replace(/_/g, " ");
}

function mapBookingVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" | "soft" {
	if (value === "CONFIRMED" || value === "COMPLETED") return "success";
	if (value === "PENDING" || value === "PROCESSING") return "warning";
	if (value === "CANCELLED" || value === "CANCELED" || value === "REJECTED") return "danger";
	if (value === "EXPIRED") return "muted";
	return "outline";
}

function mapPaymentVariation(value: string): "success" | "warning" | "danger" | "muted" | "outline" {
	if (value === "SUCCEEDED" || value === "COMPLETED" || value === "PAID") return "success";
	if (value === "PENDING" || value === "PROCESSING" || value === "REQUIRES_ACTION") return "warning";
	if (value === "FAILED" || value === "CANCELED" || value === "CANCELLED" || value === "REFUNDED") return "danger";
	return "outline";
}
