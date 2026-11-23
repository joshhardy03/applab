// Stats from stored results. Pure functions so they're easy to test.
import { GAME_BY_ID, GAMES, GameId, Result, todayNumber } from "./games";

export type GameStats = {
  played: number;
  wins: number;
  winPct: number; // 0-100
  currentStreak: number; // wins in a row (games you can lose) or plays in a row (scored games)
  bestStreak: number;
  average: number | null; // games you can lose: average over wins; scored games: average score
  best: number | null; // scored games: best score (lowest for factor games)
  distribution: { label: string; count: number }[];
};

function streakCounts(byNumber: Map<number, Result>, today: number, counts: (r: Result) => boolean) {
  const nums = [...byNumber.keys()].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const n of nums) {
    const ok = counts(byNumber.get(n)!);
    if (ok && prev !== null && n === prev + 1 && run > 0) run += 1;
    else run = ok ? 1 : 0;
    best = Math.max(best, run);
    prev = n;
  }
  // Current streak: today's puzzle (if played) or yesterday's, counting back.
  let current = 0;
  let n = byNumber.has(today) ? today : today - 1;
  while (byNumber.has(n) && counts(byNumber.get(n)!)) {
    current += 1;
    n -= 1;
  }
  return { current, best };
}

export function gameStats(results: Result[], game: GameId, now: Date = new Date()): GameStats {
  const def = GAME_BY_ID[game];
  const mine = results.filter((r) => r.game === game);
  const byNumber = new Map(mine.map((r) => [r.number, r]));
  const wins = mine.filter((r) => r.won);
  const hasLosses = def.kind === "guesses" || def.kind === "mistakes" || def.kind === "extra";
  const counts = hasLosses ? (r: Result) => r.won : () => true;
  const { current, best } = streakCounts(byNumber, todayNumber(game, now), counts);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  let distribution: GameStats["distribution"] = [];
  let average: number | null = null;
  let bestScore: number | null = null;
  const bucket = (labels: string[], pick: (r: Result) => number) =>
    labels.map((label, i) => ({ label, count: mine.filter((r) => pick(r) === i).length }));

  switch (def.kind) {
    case "guesses":
      distribution = bucket(["1", "2", "3", "4", "5", "6", "X"], (r) => (r.won ? r.score - 1 : 6));
      average = avg(wins.map((r) => r.score));
      break;
    case "mistakes":
      distribution = bucket(["0 mistakes", "1 mistake", "2 mistakes", "3 mistakes", "Lost"],
        (r) => (r.won ? r.score : 4));
      average = avg(wins.map((r) => r.score));
      break;
    case "extra":
      distribution = bucket(["+0", "+1", "+2", "+3", "+4 or more", "Lost"],
        (r) => (r.won ? Math.min(r.score, 4) : 5));
      average = avg(wins.map((r) => r.score));
      break;
    case "factor":
      distribution = bucket(["Under 1.5×", "1.5–2×", "2–3×", "3–5×", "5× or more"], (r) =>
        r.score < 1.5 ? 0 : r.score < 2 ? 1 : r.score < 3 ? 2 : r.score < 5 ? 3 : 4);
      average = avg(mine.map((r) => r.score));
      bestScore = mine.length ? Math.min(...mine.map((r) => r.score)) : null;
      break;
    case "points": {
      const pct = (r: Result) => (r.max ? r.score / r.max : 0);
      distribution = bucket(["90% or more", "75–89%", "50–74%", "Under 50%"], (r) =>
        pct(r) >= 0.9 ? 0 : pct(r) >= 0.75 ? 1 : pct(r) >= 0.5 ? 2 : 3);
      average = avg(mine.map((r) => r.score));
      bestScore = mine.length ? Math.max(...mine.map((r) => r.score)) : null;
      break;
    }
  }

  return {
    played: mine.length,
    wins: wins.length,
    winPct: mine.length ? Math.round((wins.length / mine.length) * 100) : 0,
    currentStreak: current,
    bestStreak: best,
    average,
    best: bestScore,
    distribution,
  };
}

/** Results grouped by puzzle day, newest first, with the day's point total. */
export function byDay(results: Result[]): { day: string; results: Result[]; points: number }[] {
  const days = new Map<string, Result[]>();
  for (const r of results) days.set(r.day, [...(days.get(r.day) ?? []), r]);
  const order = (g: GameId) => GAMES.findIndex((x) => x.id === g);
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, rs]) => ({
      day,
      results: rs.sort((a, b) => order(a.game) - order(b.game)),
      points: Math.round(rs.reduce((s, r) => s + r.points, 0) * 10) / 10,
    }));
}

/** Insert or replace (same game + puzzle number). */
export function upsert(results: Result[], incoming: Result[]): Result[] {
  const map = new Map(results.map((r) => [r.id, r]));
  for (const r of incoming) map.set(r.id, r);
  return [...map.values()];
}
