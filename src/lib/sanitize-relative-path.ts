export function sanitizeRelativePath(value?: string | null): string | null {
	if (!value) {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
		return null;
	}

	try {
		const url = new URL(trimmed, "http://localhost");
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return null;
	}
}

