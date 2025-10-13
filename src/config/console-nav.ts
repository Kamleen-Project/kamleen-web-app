export type ConsoleNavItem = {
	href: string;
	label: string;
	description?: string;
};

export const organizerNavItems: ConsoleNavItem[] = [
	{
		href: "/dashboard/organizer",
		label: "Overview",
		description: "Performance, quick links, and host tips",
	},
	{
		href: "/dashboard/organizer/experiences",
		label: "Experiences",
		description: "Update listings, pricing, and imagery",
	},
  {
    href: "/dashboard/organizer/experiences/archived",
    label: "Archived",
    description: "Hidden items kept for records",
  },
	{
		href: "/dashboard/organizer/bookings",
		label: "Bookings",
		description: "Review, confirm, or cancel reservations",
	},
	{
		href: "/dashboard/organizer/profile",
		label: "Profile",
		description: "Manage your public host identity",
	},
	{
		href: "/dashboard/organizer/settings",
		label: "Settings",
		description: "Preferences and workspace defaults",
	},
];

export const explorerNavItems: ConsoleNavItem[] = [
	{
		href: "/dashboard/explorer",
		label: "Overview",
		description: "Upcoming plans and saved inspiration",
	},
	{
		href: "/dashboard/explorer/reservations",
		label: "Reservations",
		description: "Review past and upcoming bookings",
	},
  {
    href: "/dashboard/explorer/wishlist",
    label: "Wishlist",
    description: "Collections and favorites",
  },
	{
		href: "/dashboard/explorer/profile",
		label: "Profile",
		description: "Personal details and preferences",
	},
];

export const adminNavItems: ConsoleNavItem[] = [
	{
		href: "/admin",
		label: "Overview",
		description: "Snapshot of activities and insights",
	},
	{
		href: "/admin/users",
		label: "Users",
		description: "Manage status and account health",
	},
	{
		href: "/admin/organizers",
		label: "Organizer requests",
		description: "Review onboarding submissions",
	},
  {
    href: "/admin/experiences/verification",
    label: "Experiences verification",
    description: "Approve or reject publish requests",
  },
	{
		href: "/admin/data-manager",
		label: "Data manager",
		description: "Control categories and locations",
	},
	{
		href: "/admin/profile",
		label: "Profile",
		description: "Your account details",
	},
	{
		href: "/admin/settings",
		label: "Settings",
		description: "Configure platform email and templates",
	},
];


