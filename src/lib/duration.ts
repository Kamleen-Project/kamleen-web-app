import { DURATION_MAX_DAYS, DURATION_MAX_HOURS, DURATION_MINUTE_STEP } from "@/config/experiences";
// Centralized duration label formatter used across the platform
// Ensures consistent clamping and minute rounding to nearest 5 down.

export type FormatDurationOptions = {
	// When true, return an empty string instead of "0 min" for zero duration
	zeroIsEmpty?: boolean;
};

export function formatDuration(
	daysStr?: string,
	hoursStr?: string,
	minutesStr?: string,
	options?: FormatDurationOptions
): string {
	const dRaw = Number.parseInt(daysStr || "0", 10);
	const hRaw = Number.parseInt(hoursStr || "0", 10);
	const mRaw = Number.parseInt(minutesStr || "0", 10);

const d = Math.max(0, Math.min(DURATION_MAX_DAYS, Number.isNaN(dRaw) ? 0 : dRaw));
const h = Math.max(0, Math.min(DURATION_MAX_HOURS, Number.isNaN(hRaw) ? 0 : hRaw));
let m = Math.max(0, Math.min(55, Number.isNaN(mRaw) ? 0 : mRaw));
m = m - (m % DURATION_MINUTE_STEP);

	const parts: string[] = [];
	if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
	if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
	if (m) parts.push(`${m} min`);

	if (!parts.length) {
		return options?.zeroIsEmpty ? "" : "0 min";
	}

	return parts.join(" ");
}



export function parseDurationToMinutes(label: string | null | undefined): number {
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

export function parseDurationParts(label: string | null | undefined): { days: number; hours: number; minutes: number } {
  const result = { days: 0, hours: 0, minutes: 0 };
  if (!label) return result;
  try {
    const parts = label.toLowerCase().split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const value = Number.parseInt(parts[i] || "0", 10);
      if (Number.isNaN(value)) continue;
      const unit = parts[i + 1] || "";
      if (unit.startsWith("day")) result.days = clampInt(value, 0, DURATION_MAX_DAYS);
      else if (unit.startsWith("hour")) result.hours = clampInt(value, 0, DURATION_MAX_HOURS);
      else if (unit.startsWith("min")) result.minutes = clampToStep(clampInt(value, 0, 55), DURATION_MINUTE_STEP);
    }
    return result;
  } catch {
    return result;
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToStep(value: number, step: number): number {
  return value - (value % step);
}

