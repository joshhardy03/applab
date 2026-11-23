// Calendar-day helpers. A "day key" is YYYY-MM-DD. All maths is done in UTC on day keys,
// so daylight-saving changes can't shift a day.

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Day key for a Date in the device's local time zone. */
export function localDayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day key for a Date in UTC. */
export function utcDayKey(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function keyToUtcMs(key: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Bad day key: ${key}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS);
}

/** Day key n days after key (n may be negative). */
export function addDays(key: string, n: number): string {
  return utcDayKey(new Date(keyToUtcMs(key) + n * DAY_MS));
}
