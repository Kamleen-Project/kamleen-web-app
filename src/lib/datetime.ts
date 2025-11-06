// Lightweight date/time helpers shared between client and server UIs
// Note: These helpers do not impose a timezone policy; they operate on
// ISO-like local strings (yyyy-MM-dd or yyyy-MM-ddTHH:mm) for UI needs.

export function getDatePart(value: string | undefined): string | null {
  if (!value) return null;
  const [date] = value.split("T");
  return date || null;
}

export function getTimePart(value: string | undefined): string {
  if (!value) return "";
  const parts = value.split("T");
  if (parts.length < 2) return "";
  return parts[1] || "";
}

export function formatLocalInput(date: Date): string {
  // yyyy-MM-ddTHH:mm (local)
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}


