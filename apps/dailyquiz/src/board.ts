// Pure logic for groups and leaderboards (no network), so it can be unit-tested.
import { addDays } from "@applab/core/dates";
import { GAMES, GameId, Result } from "./games";

export type Member = { id: string; name: string; colour: string };

/** A result as stored on the server (one row per user, game and puzzle). */
export type RemoteResult = {
  user_id: string;
  game: GameId;
  number: number;
  day: string;
  won: boolean;
  score: number;
  max: number | null;
  points: number;
  hard: boolean | null;
  hints: number | null;
};

export type BoardRow = {
  member: Member;
  total: number;
  played: number;
  byGame: Partial<Record<GameId, RemoteResult>>;
  rank: number; // 1-based, ties share a rank
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Today's (or any period's) board for a group: everyone, best total first. */
export function buildBoard(members: Member[], results: RemoteResult[], from: string, to: string): BoardRow[] {
  const inRange = results.filter((r) => r.day >= from && r.day <= to);
  const rows = members.map((member) => {
    const mine = inRange.filter((r) => r.user_id === member.id);
    const byGame: BoardRow["byGame"] = {};
    // For a single day, keep each game's result; across days the chips aren't shown.
    for (const r of mine) byGame[r.game] = r;
    return {
      member,
      total: round1(mine.reduce((s, r) => s + r.points, 0)),
      played: mine.length,
      byGame,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.total - a.total || b.played - a.played || a.member.name.localeCompare(b.member.name));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank = prev && prev.total === row.total && prev.played === row.played ? prev.rank : i + 1;
  });
  return rows;
}

/** For each game, who has played it in the period (for the "who's done what" grid). */
export function gameCoverage(rows: BoardRow[]): { game: GameId; done: number; of: number }[] {
  return GAMES.map((g) => ({
    game: g.id,
    done: rows.filter((r) => r.byGame[g.id]).length,
    of: rows.length,
  }));
}

export type Period = "today" | "week";

/** Inclusive day range for a period ending on `today`. Weeks run Monday to Sunday. */
export function periodRange(period: Period, today: string): { from: string; to: string } {
  if (period === "today") return { from: today, to: today };
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  return { from: addDays(today, -sinceMonday), to: today };
}

// ── invites ────────────────────────────────────────────────────────────────
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

export function inviteLink(base: string, code: string): string {
  return `${base.replace(/\/?$/, "/")}?join=${code}`;
}

/** Accepts a full invite link, a link with other params, or just the code. */
export function parseJoinCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = input.trim();
  const fromParam = /[?&]join=([A-Za-z0-9]{8})\b/.exec(text);
  const candidate = (fromParam ? fromParam[1] : text.replace(/[\s-]/g, "")).toUpperCase();
  return CODE_RE.test(candidate) ? candidate : null;
}

/** "Alice Smith" → "AS"; "bob" → "B". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export const PROFILE_COLOURS = [
  "#3b5bdb", "#e8590c", "#2f9e44", "#d6336c", "#7048e8", "#1c7ed6", "#f59f00", "#0ca678",
];

/** Clean a display name: trimmed, single spaces, 1-24 characters. */
export function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  const len = Array.from(name).length;
  return len >= 1 && len <= 24 ? name : null;
}

/** A server row in the app's Result shape, for the shared describe() helpers. */
export function asResult(r: RemoteResult): Result {
  return {
    id: `${r.game}-${r.number}`, game: r.game, number: r.number, day: r.day, won: r.won,
    score: r.score, max: r.max ?? undefined, hard: r.hard ?? undefined, hints: r.hints ?? undefined,
    grid: [], points: r.points, addedAt: "",
  };
}
