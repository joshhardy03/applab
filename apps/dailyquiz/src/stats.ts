// Stats from stored results. Pure functions so they're easy to test.
import { GAMES, GameId, Result, todayNumber } from "./games";

export type GameStats = {
  played: number;
  wins: number;
  winPct: number; // 0-100
  currentStreak: number; // wins in a row (Wordle/Connections) or plays in a row (Chainle)
  bestStreak: number;
  average: number | null; // wordle: avg guesses in wins; connections/travle: avg mistakes/extra guesses in wins; chainle: avg points
  best: number | null; // chainle best points
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
  const mine = results.filter((r) => r.game === game);
  const byNumber = new Map(mine.map((r) => [r.number, r]));
  const wins = mine.filter((r) => r.won);
  const counts = game === "chainle" ? () => true : (r: Result) => r.won;
  const { current, best } = streakCounts(byNumber, todayNumber(game, now), counts);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  let distribution: GameStats["distribution"] = [];
  let average: number | null = null;
  let bestScore: number | null = null;
  if (game === "wordle") {
    distribution = ["1", "2", "3", "4", "5", "6", "X"].map((label, i) => ({
      label,
      count: mine.filter((r) => (label === "X" ? !r.won : r.won && r.score === i + 1)).length,
    }));
    average = avg(wins.map((r) => r.score));
  } else if (game === "connections") {
    distribution = ["0", "1", "2", "3", "Lost"].map((label, i) => ({
      label: label === "Lost" ? label : `${label} mistakes`.replace(/^1 mistakes$/, "1 mistake"),
      count: mine.filter((r) => (label === "Lost" ? !r.won : r.won && r.score === i)).length,
    }));
    average = avg(wins.map((r) => r.score));
  } else if (game === "travle") {
    distribution = ["+0", "+1", "+2", "+3", "+4 or more", "Lost"].map((label, i) => ({
      label,
      count: mine.filter((r) =>
        label === "Lost" ? !r.won : r.won && (i === 4 ? r.score >= 4 : r.score === i),
      ).length,
    }));
    average = avg(wins.map((r) => r.score));
  } else {
    const bands: [string, number, number][] = [
      ["4,500+", 4500, 5001], ["3,500+", 3500, 4500], ["2,500+", 2500, 3500], ["<2,500", 0, 2500],
    ];
    distribution = bands.map(([label, lo, hi]) => ({
      label, count: mine.filter((r) => r.score >= lo && r.score < hi).length,
    }));
    average = avg(mine.map((r) => r.score));
    bestScore = mine.length ? Math.max(...mine.map((r) => r.score)) : null;
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
