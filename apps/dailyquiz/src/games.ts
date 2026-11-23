// The supported games: links, share-text parsers, puzzle numbering and daily points.
// We only read the text a player chooses to share; we never embed or copy the games.
// Share formats were read from each game's own site code (Nov 2026); see SPEC.md.
import { addDays, dayKeyIn, daysBetween } from "@applab/core/dates";

export type GameId =
  | "wordle" | "connections" | "chainle" | "travle"
  | "wonderhop" | "crowdict" | "fermi" | "eraly"
  | "wheronaut" | "farflung" | "krillion" | "maptap";

/**
 * How a game's score reads, for stats:
 * - guesses / mistakes / extra: lower is better, with a win or loss
 * - points: higher is better, out of `max`
 * - factor: lower is better (how many times off, 1 = exact)
 */
export type ScoreKind = "guesses" | "mistakes" | "extra" | "points" | "factor";

export type Result = {
  id: string; // `${game}-${number}`
  game: GameId;
  number: number;
  day: string; // the puzzle's own day (YYYY-MM-DD)
  won: boolean;
  /** wordle: guesses (7 = failed); connections: mistakes; travle: extra guesses (win) or
   *  countries away (loss); fermi: factor off; everything else: points/metres/km scored */
  score: number;
  max?: number; // for "points" games: the most you could score
  hard?: boolean;
  hints?: number;
  grid: string[];
  points: number; // daily points (0 … game's maxPoints), see SPEC.md
  addedAt: string; // ISO time
};

type Parsed = Omit<Result, "id" | "day" | "addedAt">;

export type GameDef = {
  id: GameId;
  name: string;
  url: string;
  blurb: string;
  maxPoints: number;
  kind: ScoreKind;
  /** Day key of puzzle #`firstNumber`. */
  firstDay: string;
  firstNumber: number;
  /** Which calendar the game's day follows: "local", "utc" or an IANA zone. */
  zone: string;
  /** False for games whose share text has no puzzle number (we number by date). */
  numbered: boolean;
  parse: (text: string, now: Date) => Parsed | null;
  describe: (r: Result) => string;
};

// ── helpers ────────────────────────────────────────────────────────────────
const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));
const chars = (s: string) => Array.from(s.trim());
const NUM = String.raw`\d{1,3}(?:[,.\s  ]\d{3})+|\d+`; // 1,980 · 1.980 · 1 980 · 1980
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const round1 = (n: number) => Math.round(n * 10) / 10;
const ratioPoints = (score: number, max: number, outOf = 5) =>
  max > 0 ? round1(Math.max(0, Math.min(1, score / max)) * outOf) : 0;

function emojiRow(after: string, allowed: Set<string>): string[] {
  return after
    .split(/\s+/)
    .filter((w) => chars(w).length >= 1 && chars(w).every((c) => allowed.has(c)))
    .slice(0, 1);
}

function firstLine(text: string, from: number): string {
  const end = text.indexOf("\n", from);
  return end === -1 ? text.slice(from) : text.slice(from, end);
}

/** Today's puzzle number for a game. */
export function todayNumber(game: GameId, now: Date = new Date()): number {
  const g = GAME_BY_ID[game];
  return g.firstNumber + daysBetween(g.firstDay, dayKeyIn(g.zone, now));
}

/** The day a puzzle number belongs to. */
export function dayOfNumber(game: GameId, n: number): string {
  const g = GAME_BY_ID[game];
  return addDays(g.firstDay, n - g.firstNumber);
}

function numberForDay(game: GameId, day: string): number {
  const g = GAME_BY_ID[game];
  return g.firstNumber + daysBetween(g.firstDay, day);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december"];

/** "November 23" → the most recent such date on or before tomorrow (shares carry no year). */
function dayFromMonthDay(monthName: string, dayOfMonth: number, today: string): string | null {
  const m = MONTHS.findIndex((x) => x.startsWith(monthName.toLowerCase().slice(0, 3)));
  if (m < 0 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  const year = Number(today.slice(0, 4));
  for (const y of [year + 1, year, year - 1]) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
    if (daysBetween(key, today) >= -1) return key;
  }
  return null;
}

// ── Wordle: "Wordle 1,620 4/6*" then rows of ⬛⬜🟨🟩 (or 🟧🟦 in high contrast)
const WORDLE_SQ = new Set(["⬛", "⬜", "🟨", "🟩", "🟧", "🟦"]);
function parseWordle(text: string): Parsed | null {
  const m = /Wordle\s+(\d[\d,.\s]*?)\s+([1-6Xx])\/6(\*)?/.exec(text);
  if (!m) return null;
  const failed = m[2].toUpperCase() === "X";
  const guesses = failed ? 7 : Number(m[2]);
  const grid = text
    .slice(m.index + m[0].length)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => chars(l).length === 5 && chars(l).every((c) => WORDLE_SQ.has(c)));
  return {
    game: "wordle", number: digits(m[1]), won: !failed, score: guesses,
    hard: Boolean(m[3]), grid: grid.slice(0, 6), points: failed ? 0 : 7 - guesses,
  };
}

// ── Connections: "Connections" / "Puzzle #900" then rows of 4 of 🟨🟩🟦🟪
const CONN_SQ = new Set(["🟨", "🟩", "🟦", "🟪"]);
function parseConnections(text: string): Parsed | null {
  const m = /Connections\s*(?:\r?\n\s*)?Puzzle\s*#\s*([\d,.]+)/i.exec(text);
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
function parseChainle(text: string, now: Date): Parsed | null {
  if (/Chainle\s+Unlimited/i.test(text)) return null; // practice mode, not the daily
  const m = /Chainle(?:\s*#\s*([\d,.]+))?\s*[·•\-–—:]\s*([\d,.]+)\s*🔗/.exec(text);
  if (!m) return null;
  const pts = Math.min(5000, digits(m[2]));
  return {
    game: "chainle", number: m[1] ? digits(m[1]) : todayNumber("chainle", now), won: true,
    score: pts, max: 5000,
    grid: emojiRow(text.slice(m.index + m[0].length), new Set(["🟩", "🟨", "🟧", "🟥"])),
    points: round1(pts / 1000),
  };
}

// ── Travle: "#travle #1440 (hard mode) +2 (1 hint)" or "#travle #1440 (3 away)".
// Other maps (#travle_usa …) and practice aren't counted.
function parseTravle(text: string): Parsed | null {
  const m = /#travle\s+#\s*([\d,.]+)([^\n]*)/i.exec(text);
  if (!m) return null;
  const rest = m[2];
  const plus = /\+(\d+)/.exec(rest);
  const away = /\((\d+)\s+away\)/i.exec(rest);
  if (!plus && !away) return null;
  const hints = Number(/\((\d+)\s+hints?\)/i.exec(rest)?.[1] ?? 0);
  const won = Boolean(plus);
  const score = won ? Number(plus![1]) : Number(away![1]);
  return {
    game: "travle", number: digits(m[1]), won, score,
    hard: /\(hard mode\)/i.test(rest), hints,
    grid: emojiRow(text.slice(m.index + m[0].length), new Set(["✅", "🟩", "🟧", "🟥"])),
    points: won ? Math.max(1, 5 - score - hints) : 0,
  };
}

// ── Wonderhop: "Wonderhop #50 · ☁️ Sky 540/700" (one mode) or
// "Wonderhop #50 · 1,980/2,800" (the whole day). Score is the last "x/y" on the line.
function parseWonderhop(text: string): Parsed | null {
  const m = /Wonderhop\s*#\s*(\d+)\s*·/.exec(text);
  if (!m) return null;
  const line = firstLine(text, m.index);
  const sc = new RegExp(`(${NUM})\\s*/\\s*(${NUM})\\s*$`).exec(line.trim());
  if (!sc) return null;
  const score = digits(sc[1]);
  const max = digits(sc[2]);
  if (!max || score > max) return null;
  return {
    game: "wonderhop", number: Number(m[1]), won: true, score, max,
    grid: [], points: ratioPoints(score, max),
  };
}

// ── Crowdict (was Noillirk): "Crowdict #40 · 🧍73/100" (crowd mode) or
// "Crowdict #40 · Krillion-style · ★ 450" (rarest mode). "Unlimited" isn't the daily.
function parseCrowdict(text: string): Parsed | null {
  const m = /(?:Crowdict|Noillirk)\s*#\s*([\d,]+)([^\n]*)/.exec(text);
  if (!m) return null;
  const rest = m[2];
  const crowd = new RegExp(`🧍\\s*(${NUM})\\s*/\\s*(${NUM})`).exec(rest);
  const stars = new RegExp(`★\\s*(${NUM})`).exec(rest);
  let score: number;
  let max: number;
  if (crowd) {
    score = digits(crowd[1]);
    max = digits(crowd[2]) || 100;
  } else if (stars) {
    score = digits(stars[1]);
    max = 1000; // assumed: 10 prompts × up to 100 (not stated in the share text)
  } else return null;
  return {
    game: "crowdict", number: digits(m[1]), won: true, score: Math.min(score, max), max,
    grid: [], points: ratioPoints(score, max),
  };
}

// ── Fermi: "Fermi · No. 120", one line per question, then "2.34× score · top 12%".
// Lower is better (how many times off, on average).
function parseFermi(text: string): Parsed | null {
  const m = /Fermi\s*·\s*No\.?\s*(\d+)/.exec(text);
  if (!m) return null;
  const sc = /([\d,.]+)\s*×\s*score/.exec(text.slice(m.index));
  if (!sc) return null;
  const factor = Number(sc[1].replace(/,/g, ""));
  if (!Number.isFinite(factor) || factor < 1) return null;
  // 1× (spot on) = 5 points, 10× = 3.3, 1000× = 0
  const points = round1(Math.max(0, Math.min(5, 5 * (1 - Math.log10(factor) / 3))));
  return { game: "fermi", number: Number(m[1]), won: true, score: factor, grid: [], points };
}

// ── Eraly: "Eraly #39 · I travelled to 1987 AD" / "▰▰▰▱… 540/700" / squares.
// Archive replays are marked "(Archive)" and don't count.
function parseEraly(text: string): Parsed | null {
  const m = /Eraly\s*#\s*(\d+)([^\n]*)/.exec(text);
  if (!m || /\(Archive\)/i.test(m[2])) return null;
  const sc = new RegExp(`(${NUM})\\s*/\\s*(${NUM})`).exec(text.slice(m.index + m[0].length));
  if (!sc) return null;
  const score = digits(sc[1]);
  const max = digits(sc[2]) || 700;
  return {
    game: "eraly", number: Number(m[1]), won: true, score: Math.min(score, max), max,
    grid: [], points: ratioPoints(score, max),
  };
}

// ── Wheronaut: "Wheronaut #54" / tier emojis / "6/7 answered · 5,200 m · Jet Stream".
// A perfect flight is 7,000 m.
function parseWheronaut(text: string): Parsed | null {
  const m = /Wheronaut\s*#\s*(\d+)/.exec(text);
  if (!m) return null;
  const sc = new RegExp(`(\\d+)\\s*/\\s*(\\d+)\\s*answered\\s*·\\s*(${NUM})\\s*m\\b`).exec(text.slice(m.index));
  if (!sc) return null;
  const metres = Math.min(7000, digits(sc[3]));
  return {
    game: "wheronaut", number: Number(m[1]), won: true, score: metres, max: 7000,
    grid: [], points: ratioPoints(metres, 7000),
  };
}

// ── Krillion: "Krillion #131 🦐" / "520" / tier squares. Out of 700.
// Archive ("Krillion ⟲ #") and unlimited ("Krillion ∞ #") don't count.
function parseKrillion(text: string): Parsed | null {
  const m = /Krillion\s+#\s*(\d+)\s*🦐\s*\r?\n\s*(\d[\d,]*)/.exec(text);
  if (!m) return null;
  const score = Math.min(700, digits(m[2]));
  return {
    game: "krillion", number: Number(m[1]), won: true, score, max: 700,
    grid: [], points: ratioPoints(score, 700),
  };
}

// ── Farflung: "Farflung · Daily ranked" / "8400/10000 km" / squares. No puzzle number,
// so it's filed under today. Other modes (classic, wander, archive…) don't count.
function parseFarflung(text: string, now: Date): Parsed | null {
  const m = /Farflung\s*·\s*Daily\s+(?:ranked|casual)/i.exec(text);
  if (!m) return null;
  const sc = new RegExp(`(${NUM})\\s*/\\s*(${NUM})\\s*km`).exec(text.slice(m.index));
  if (!sc) return null;
  const score = digits(sc[1]);
  const max = digits(sc[2]);
  if (!max) return null;
  return {
    game: "farflung", number: todayNumber("farflung", now), won: true,
    score: Math.min(score, max), max, grid: [], points: ratioPoints(score, max),
  };
}

// ── MapTap: "www.maptap.gg November 23" (or "MapTap November 23") / round scores /
// "Final score: 812". Dated rather than numbered. Max taken as 1,000 (not stated).
function parseMaptap(text: string, now: Date): Parsed | null {
  const m = /(?:www\.maptap\.gg|<?https:\/\/maptap\.gg>?|MapTap)\s+([A-Za-z]+)\s+(\d{1,2})\s*\r?\n/.exec(text);
  if (!m) return null;
  const sc = /Final score:\s*(\d+)/i.exec(text.slice(m.index));
  if (!sc) return null;
  const day = dayFromMonthDay(m[1], Number(m[2]), dayKeyIn("local", now));
  if (!day) return null;
  const score = Math.min(1000, Number(sc[1]));
  return {
    game: "maptap", number: numberForDay("maptap", day), won: true, score, max: 1000,
    grid: [], points: ratioPoints(score, 1000),
  };
}

const ptsOf = (r: Result) => `${fmt(r.score)}/${fmt(r.max ?? 0)}`;

export const GAMES: GameDef[] = [
  {
    id: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html",
    blurb: "Guess the five-letter word in six tries.", maxPoints: 6, kind: "guesses",
    firstDay: "2021-06-19", firstNumber: 0, zone: "local", numbered: true,
    parse: parseWordle,
    describe: (r) => (r.won ? `${r.score}/6${r.hard ? "*" : ""}` : "X/6"),
  },
  {
    id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections",
    blurb: "Sort sixteen words into four groups.", maxPoints: 5, kind: "mistakes",
    firstDay: "2023-06-12", firstNumber: 1, zone: "local", numbered: true,
    parse: parseConnections,
    describe: (r) =>
      !r.won ? "Not solved" : r.score === 0 ? "Perfect" : `${r.score} mistake${r.score === 1 ? "" : "s"}`,
  },
  {
    id: "chainle", name: "Chainle", url: "https://chainle.io",
    blurb: "Find the words that link the chains.", maxPoints: 5, kind: "points",
    firstDay: "2026-08-20", firstNumber: 1, zone: "utc", numbered: true,
    parse: parseChainle,
    describe: (r) => `${fmt(r.score)} pts`,
  },
  {
    id: "travle", name: "Travle", url: "https://travle.earth",
    blurb: "Get from one country to another through their neighbours.", maxPoints: 5, kind: "extra",
    firstDay: "2022-12-15", firstNumber: 1, zone: "local", numbered: true,
    parse: parseTravle,
    describe: (r) => {
      if (!r.won) return `${r.score} away`;
      const base = r.score === 0 && !r.hints ? "Perfect" : `+${r.score}`;
      return r.hints ? `${base}, ${r.hints} hint${r.hints === 1 ? "" : "s"}` : base;
    },
  },
  {
    id: "wonderhop", name: "Wonderhop", url: "https://wonderhop.io",
    blurb: "Guess what most people say, or what nobody does.", maxPoints: 5, kind: "points",
    firstDay: "2026-10-05", firstNumber: 1, zone: "America/Toronto", numbered: true,
    parse: parseWonderhop, describe: ptsOf,
  },
  {
    id: "crowdict", name: "Crowdict", url: "https://crowdict.com",
    blurb: "Name the right answers the crowd gives, or misses.", maxPoints: 5, kind: "points",
    firstDay: "2026-10-15", firstNumber: 1, zone: "local", numbered: true,
    parse: parseCrowdict,
    describe: (r) => (r.max === 100 ? `🧍${fmt(r.score)}/100` : `★ ${fmt(r.score)}`),
  },
  {
    id: "fermi", name: "Fermi", url: "https://fermi.gg",
    blurb: "Estimate the unestimable. Closer is better.", maxPoints: 5, kind: "factor",
    firstDay: "2026-07-27", firstNumber: 1, zone: "America/New_York", numbered: true,
    parse: parseFermi,
    describe: (r) => `${r.score < 10 ? r.score.toFixed(2) : r.score.toFixed(1)}× off`,
  },
  {
    id: "eraly", name: "Eraly", url: "https://eraly.io",
    blurb: "Guess the year: travel through time.", maxPoints: 5, kind: "points",
    firstDay: "2026-10-16", firstNumber: 1, zone: "local", numbered: true,
    parse: parseEraly, describe: ptsOf,
  },
  {
    id: "wheronaut", name: "Wheronaut", url: "https://wheronaut.com",
    blurb: "A daily geography climb in a hot-air balloon.", maxPoints: 5, kind: "points",
    firstDay: "2026-10-01", firstNumber: 1, zone: "utc", numbered: true,
    parse: parseWheronaut, describe: (r) => `${fmt(r.score)} m`,
  },
  {
    id: "farflung", name: "Farflung", url: "https://farflunggame.fun",
    blurb: "Find the countries others overlook.", maxPoints: 5, kind: "points",
    firstDay: "2026-01-01", firstNumber: 1, zone: "local", numbered: false,
    parse: parseFarflung, describe: (r) => `${ptsOf(r)} km`,
  },
  {
    id: "krillion", name: "Krillion", url: "https://krillion.io",
    blurb: "Seven prompts. Rarer answers score more.", maxPoints: 5, kind: "points",
    firstDay: "2026-07-16", firstNumber: 1, zone: "America/New_York", numbered: true,
    parse: parseKrillion, describe: ptsOf,
  },
  {
    id: "maptap", name: "MapTap", url: "https://maptap.gg",
    blurb: "Tap five places on the globe.", maxPoints: 5, kind: "points",
    firstDay: "2026-01-01", firstNumber: 1, zone: "local", numbered: false,
    parse: parseMaptap, describe: (r) => `${fmt(r.score)}`,
  },
];

export const GAME_BY_ID: Record<GameId, GameDef> = Object.fromEntries(
  GAMES.map((g) => [g.id, g]),
) as Record<GameId, GameDef>;

export const MAX_DAILY_POINTS = GAMES.reduce((s, g) => s + g.maxPoints, 0);

export type ParseOutcome =
  | { ok: true; results: Result[] }
  | { ok: false; error: string };

/** Find every supported game result in a pasted block of text. */
export function parseShareText(text: string, now: Date = new Date()): ParseOutcome {
  if (!text || !text.trim()) return { ok: false, error: "Nothing to add: the text is empty." };
  const found = GAMES.map((g) => g.parse(text, now)).filter((r): r is Parsed => r !== null);
  if (found.length === 0) {
    if (/Chainle\s+Unlimited|Krillion\s+[⟲∞]|\(Archive\)|Unlimited|_practice/i.test(text)) {
      return { ok: false, error: "That looks like a practice, archive or unlimited game. Only the daily puzzle counts." };
    }
    return {
      ok: false,
      error: "Couldn't find a result from a supported game. Use the game's Share button and paste the whole text.",
    };
  }
  const addedAt = now.toISOString();
  const results: Result[] = [];
  for (const r of found) {
    const g = GAME_BY_ID[r.game];
    const today = todayNumber(r.game, now);
    if (!Number.isFinite(r.number) || r.number < g.firstNumber || r.number > today + 1) {
      return { ok: false, error: `${g.name} #${r.number} doesn't look like a real puzzle number.` };
    }
    results.push({ ...r, id: `${r.game}-${r.number}`, day: dayOfNumber(r.game, r.number), addedAt });
  }
  return { ok: true, results };
}

/** Short human summary, e.g. "4/6", "1 mistake", "540/700". */
export function describe(r: Result): string {
  return GAME_BY_ID[r.game].describe(r);
}
