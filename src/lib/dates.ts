const DAY_MS = 86_400_000;

/** Date-only values are interpreted at UTC midnight, never local midnight. */
export function dayNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  )
    return NaN;
  return timestamp / DAY_MS;
}

export function addDays(value: string, days: number): string {
  return new Date((dayNumber(value) + days) * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function todayDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dayNumber(value) * DAY_MS));
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("tr-TR").format(value);
export const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
