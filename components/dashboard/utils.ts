export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function computeTrend(
  current: number,
  previous: number,
): { label: string; up: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { label: "+100%", up: true };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { label: `${sign}${pct.toFixed(1)}%`, up: pct >= 0 };
}

export function getChartViewLabel(view: "daily" | "weekly" | "monthly") {
  switch (view) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "Daily";
  }
}

export function getChartUnit(view: "daily" | "weekly" | "monthly") {
  switch (view) {
    case "weekly":
      return "weeks";
    case "monthly":
      return "months";
    default:
      return "days";
  }
}

export function getWeekKey(dateText: string) {
  const date = new Date(dateText);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

export function getMonthKey(dateText: string) {
  return dateText.slice(0, 7);
}

export function formatYAxisCurrency(value: number) {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}k`;
  }

  return `₱${value.toFixed(0)}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November",  "December",
] as const;

export function formatMonthLabel(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTH_LABELS[m - 1] ?? month;
}