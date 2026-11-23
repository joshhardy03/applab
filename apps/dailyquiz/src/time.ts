// Small pure formatting helpers shared by screens.

export function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

/** "2026-11-23" → "Monday 23 November" (or "Today" / "Yesterday" relative to `today`). */
export function friendlyDay(day: string, today: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getUTCDay()];
  const month = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"][m - 1];
  return `${weekday} ${d} ${month}${y !== ty ? ` ${y}` : ""}`;
}

export function greeting(hour: number): string {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** 23.4 → "23.4", 20 → "20". */
export function pts(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
