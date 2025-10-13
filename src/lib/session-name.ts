export type SessionNameVariant = "full" | "time";

function parseDurationToMinutes(label: string | null | undefined): number {
  if (!label) return 0;
  const lower = label.toLowerCase();
  let minutes = 0;
  const dayMatch = lower.match(/(\d+)\s*day/);
  const hourMatch = lower.match(/(\d+)\s*hour/);
  const minMatch = lower.match(/(\d+)\s*min/);
  if (dayMatch) minutes += (Number.parseInt(dayMatch[1], 10) || 0) * 24 * 60;
  if (hourMatch) minutes += (Number.parseInt(hourMatch[1], 10) || 0) * 60;
  if (minMatch) minutes += Number.parseInt(minMatch[1], 10) || 0;
  if (!dayMatch && !hourMatch && !minMatch) {
    const numeric = Number.parseInt(lower, 10);
    if (!Number.isNaN(numeric)) minutes += numeric;
  }
  return Math.max(0, minutes);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

function formatDateFull(value: Date) {
  // Example: Monday 8 Oct
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(value);
  const day = new Intl.DateTimeFormat("en", { day: "numeric" }).format(value);
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(value);
  return `${weekday} ${day} ${month}`;
}

export function getSessionName(options: {
  startAt: string | Date;
  durationLabel?: string | null;
  fallbackDurationLabel?: string | null;
  variant?: SessionNameVariant;
}): string {
  const { startAt, durationLabel, fallbackDurationLabel, variant = "time" } = options;
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const minutes = parseDurationToMinutes(durationLabel ?? fallbackDurationLabel ?? null);
  const end = minutes ? new Date(start.getTime() + minutes * 60 * 1000) : null;
  const range = end ? `${formatTime(start)} to ${formatTime(end)}` : formatTime(start);

  if (variant === "full") {
    return `${formatDateFull(start)} – ${range}`;
  }
  return range;
}


