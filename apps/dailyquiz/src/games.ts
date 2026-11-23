// The three v1 games: links, share-text parsers, puzzle numbering and daily points.
// We only read the text a player chooses to share; we never embed or copy the games.
import { addDays, daysBetween, localDayKey, utcDayKey } from "@applab/core/dates";

export type GameId = "wordle" | "connections" | "chainle";

export type Result = {
  id: string; // `${game}-${number}`
  game: GameId;
  number: number;
  day: string; // the puzzle's own day (YYYY-MM-DD)
  won: boolean;
  /** wordle: guesses (7 = failed); connections: mistakes; chainle: points (0-5000) */
  score: number;
  hard?: boolean;
  grid: string[];
  points: number; // daily points, see SPEC.md
  addedAt: string; // ISO time
};

type GameDef = {
  id: GameId;
  name: string;
  url: string;
  blurb: string;
  maxPoints: number;
  /** Day key of puzzle #`firstNumber`. */
  firstDay: string;
  firstNumber: number;
  /** Chainle numbers its puzzles by UTC date; the NYT games use local date. */
  utc: boolean;
};

export const GAMES: GameDef[] = [
  {
    id: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html",
    blurb: "Guess the five-letter word in six tries.", maxPoints: 6,
    firstDay: "2021-06-19", firstNumber: 0, utc: false,
  },
  {
    id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections",
    blurb: "Sort sixteen words into four groups.", maxPoints: 5,
    firstDay: "2023-06-12", firstNumber: 1, utc: false,
  },
  {
    id: "chainle", name: "Chainle", url: "https://chainle.io",
    blurb: "Find the words that link the chains.", maxPoints: 5,
    firstDay: "2026-08-20", firstNumber: 1, utc: true,
  },
];

export const GAME_BY_ID: Record<GameId, GameDef> = Object.fromEntries(
  GAMES.map((g) => [g.id, g]),
) as Record<GameId, GameDef>;

export const MAX_DAILY_POINTS = GAMES.reduce((s, g) => s + g.maxPoints, 0);

/** Today's puzzle number for a game. */
export function todayNumber(game: GameId, now: Date = new Date()): number {
  const g = GAME_BY_ID[game];
  const today = g.utc ? utcDayKey(now) : localDayKey(now);
  return g.firstNumber + daysBetween(g.firstDay, today);
}

/** The day a puzzle number belongs to. */
export function dayOfNumber(game: GameId, n: number): string {
  const g = GAME_BY_ID[game];
  return addDays(g.firstDay, n - g.firstNumber);
}

const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));
const chars = (s: string) => Array.from(s.trim());

// ── Wordle: "Wordle 1,620 4/6*" then rows of ⬛⬜🟨🟩 (or 🟧🟦 in high contrast)
const WORDLE_RE = /Wordle\s+([\d][\d,.\s]*?)\s+([1-6Xx])\/6(\*)?/;
const WORDLE_SQ = new Set(["⬛", "⬜", "🟨", "🟩", "🟧", "🟦"]);

function parseWordle(text: string): Omit<Result, "id" | "day" | "addedAt"> | null {
  const m = WORDLE_RE.exec(text);
  if (!m) return null;
  const failed = m[2].toUpperCase() === "X";
  const guesses = failed ? 7 : Number(m[2]);
  const after = text.slice(m.index + m[0].length).split(/\r?\n/);
  const grid = after
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && chars(l).length === 5 && chars(l).every((c) => WORDLE_SQ.has(c)));
  return {
    game: "wordle", number: digits(m[1]), won: !failed, score: guesses,
    hard: Boolean(m[3]), grid: grid.slice(0, 6), points: failed ? 0 : 7 - guesses,
  };
}

// ── Connections: "Connections" / "Puzzle #900" then rows of 4 of 🟨🟩🟦🟪
const CONN_RE = /Connections\s*(?:\r?\n\s*)?Puzzle\s*#\s*([\d,.]+)/i;
const CONN_SQ = new Set(["🟨", "🟩", "🟦", "🟪"]);

function parseConnections(text: string): Omit<Result, "id" | "day" | "addedAt"> | null {
  const m = CONN_RE.exec(text);
  if (!m) return null;
  const rows = text
    .slice(m.index + m[0].length)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => chars(l).length === 4 && chars(l).every((c) => CONN_SQ.has(c)));
  if (rows.length === 0) return null;
  const solved = rows.filter((r) => new Set(chars(r)).size === 1).length;
  const mistakes = rows.length - solved;
  const won = solved === 4;
  return {
    game: "connections", number: digits(m[1]), won, score: mistakes,
    grid: rows.slice(0, 8), points: won ? 5 - mistakes : 0,
  };
}

// ── Chainle: "Chainle #96 · 3,450 🔗" [Beat N% of players] then 5 of 🟩🟨🟧🟥
const CHAINLE_RE = /Chainle(?:\s*#\s*([\d,.]+))?\s*[·•\-–—:]\s*([\d,.]+)\s*🔗/;
const CHAINLE_SQ = new Set(["🟩", "🟨", "🟧", "🟥"]);

function parseChainle(text: string, now: Date): Omit<Result, "id" | "day" | "addedAt"> | null {
  if (/Chainle\s+Unlimited/i.test(text)) return null; // practice mode, not the daily
  const m = CHAINLE_RE.exec(text);
  if (!m) return null;
  const pts = Math.min(5000, digits(m[2]));
  const grid = text
    .slice(m.index + m[0].length)
    .split(/\s+/)
    .filter((w) => chars(w).length >= 1 && chars(w).every((c) => CHAINLE_SQ.has(c)));
  return {
    game: "chainle", number: m[1] ? digits(m[1]) : todayNumber("chainle", now), won: true,
    score: pts, grid: grid.slice(0, 1), points: Math.round(pts / 100) / 10,
  };
}

export type ParseOutcome =
  | { ok: true; results: Result[] }
  | { ok: false; error: string };

/** Find every supported game result in a pasted block of text. */
export function parseShareText(text: string, now: Date = new Date()): ParseOutcome {
  if (!text || !text.trim()) return { ok: false, error: "Nothing to add: the text is empty." };
  if (/Chainle\s+Unlimited/i.test(text) && !/Wordle|Connections/i.test(text)) {
    return { ok: false, error: "That's a Chainle Unlimited result. Only the daily puzzle counts." };
  }
  const found = [parseWordle(text), parseConnections(text), parseChainle(text, now)].filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );
  if (found.length === 0) {
    return {
      ok: false,
      error: "Couldn't find a Wordle, Connections or Chainle result. Use the game's Share button and paste the whole text.",
    };
  }
  const addedAt = now.toISOString();
  const results: Result[] = [];
  for (const r of found) {
    const today = todayNumber(r.game, now);
    if (!Number.isFinite(r.number) || r.number < GAME_BY_ID[r.game].firstNumber || r.number > today + 1) {
      return { ok: false, error: `${GAME_BY_ID[r.game].name} #${r.number} doesn't look like a real puzzle number.` };
    }
    results.push({ ...r, id: `${r.game}-${r.number}`, day: dayOfNumber(r.game, r.number), addedAt });
  }
  return { ok: true, results };
}

/** Short human summary, e.g. "4/6", "1 mistake", "3,450 pts". */
export function describe(r: Result): string {
  switch (r.game) {
    case "wordle":
      return r.won ? `${r.score}/6${r.hard ? "*" : ""}` : "X/6";
    case "connections":
      if (!r.won) return "Not solved";
      return r.score === 0 ? "Perfect" : `${r.score} mistake${r.score === 1 ? "" : "s"}`;
    case "chainle":
      return `${r.score.toLocaleString("en-GB")} pts`;
  }
}
