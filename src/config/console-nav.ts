export type ConsoleNavItem = {
	href: string;
	label: string;
	description?: string;
	icon?: string;
	// Optional nested items to render as a collapsible submenu in the console sidebar
	children?: ConsoleNavItem[];
};

export const organizerNavItems: ConsoleNavItem[] = [
	{
		href: "/dashboard/organizer",
		label: "Overview",
		// description: "Performance, quick links, and host tips",
		icon: "LayoutDashboard",
	},
	{
		href: "/dashboard/organizer/experiences",
		label: "Experiences",
		// description: "Update listings, pricing, and imagery",
		icon: "Sparkles",
	},
	{
		href: "/dashboard/organizer/experiences/archived",
		label: "Archived",
		// description: "Hidden items kept for records",
		icon: "Archive",
	},
	{
		href: "/dashboard/organizer/bookings",
		label: "Bookings",
		// description: "Review, confirm, or cancel reservations",
		icon: "CalendarCheck",
	},
	{
		href: "/dashboard/organizer/profile",
		label: "Profile",
		// description: "Manage your public host identity",
		icon: "User",
	},
	{
		href: "/dashboard/organizer/settings",
		label: "Settings",
		// description: "Preferences and workspace defaults",
		icon: "Settings",
	},
];

export const explorerNavItems: ConsoleNavItem[] = [
	{
		href: "/dashboard/explorer",
		label: "Overview",
		// description: "Upcoming plans and saved inspiration",
		icon: "LayoutDashboard",
	},
	{
		href: "/dashboard/explorer/reservations",
		label: "Reservations",
		// description: "Review past and upcoming bookings",
		icon: "CalendarRange",
	},
	{
		href: "/dashboard/explorer/wishlist",
		label: "Wishlist",
		// description: "Collections and favorites",
		icon: "Heart",
	},
	{
		href: "/dashboard/explorer/profile",
		label: "Profile",
		// description: "Personal details and preferences",
		icon: "User",
	},
];

export const adminNavItems: ConsoleNavItem[] = [
	{
		href: "/admin",
		label: "Overview",
		// description: "Snapshot of activities and insights",
		icon: "LayoutDashboard",
	},
	{
		href: "/admin/users",
		label: "Users",
		// description: "Manage status and account health",
		icon: "Users",
	},
	{
		href: "/admin/organizers",
		label: "Organizer requests",
		// description: "Review onboarding submissions",
		icon: "UserCheck",
	},
	{
		href: "/admin/experiences",
		label: "Experiences",
		// description: "Browse, filter, and verify listings",
		icon: "Sparkles",
	},
	{
		href: "/admin/data-manager",
		label: "Data manager",
		// description: "Control categories and locations",
		icon: "Database",
		children: [
			{
				href: "/admin/data-manager/categories",
				label: "Experience categories",
			},
			{
				href: "/admin/data-manager/locations",
				label: "Locations",
			},
		],
	},
	{
		href: "/admin/bookings",
		label: "Bookings",
		// description: "Manage reservations and payments",
		icon: "CalendarCheck",
	},
	{
		href: "/admin/payments",
		label: "Payments",
		// description: "Review and moderate platform payments",
		icon: "CreditCard",
	},
	{
		href: "/admin/profile",
		label: "Profile",
		// description: "Your account details",
		icon: "User",
	},
	{
		href: "/admin/newsletter",
		label: "Newsletter",
		// description: "Manage subscribers and campaigns",
		icon: "Mail",
	},
	{
		href: "/admin/content",
		label: "Content",
		// description: "Manage site banners and content",
		icon: "LayoutTemplate",
	},
	{
		href: "/admin/settings",
		label: "Settings",
		// description: "Configure platform settings",
		icon: "Settings",
		children: [
			{
				href: "/admin/settings/email",
				label: "Email settings",
				// description: "SMTP and email template management",
			},
			{
				href: "/admin/settings/ticket-templates",
				label: "Ticket Templates",
				// description: "Design and branding for PDF tickets",
			},
			{
				href: "/admin/settings/payments",
				label: "Payments",
				// description: "Configure payment providers and defaults",
			},
			{
				href: "/admin/settings/components",
				label: "Components",
				// description: "UI kit showcase and testing",
			},
		],
	},
];


