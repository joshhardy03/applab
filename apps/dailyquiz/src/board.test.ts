import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBoard, cleanName, gameCoverage, initials, inviteLink, Member, parseJoinCode, periodRange, RemoteResult,
} from "./board";

const A: Member = { id: "a", name: "Alice", colour: "#111111" };
const B: Member = { id: "b", name: "Bob", colour: "#222222" };
const C: Member = { id: "c", name: "Cara", colour: "#333333" };

function res(user: string, game: RemoteResult["game"], day: string, points: number): RemoteResult {
  return { user_id: user, game, number: 1, day, won: true, score: 1, max: null, points, hard: null, hints: null };
}

test("board sorts by total, shares ranks on ties, includes people who haven't played", () => {
  const results = [
    res("a", "wordle", "2026-11-23", 4), res("a", "connections", "2026-11-23", 5),
    res("b", "wordle", "2026-11-23", 6), res("b", "chainle", "2026-11-23", 3),
    res("a", "wordle", "2026-11-22", 6), // yesterday: excluded
  ];
  const rows = buildBoard([A, B, C], results, "2026-11-23", "2026-11-23");
  assert.deepEqual(rows.map((r) => [r.member.name, r.total, r.played, r.rank]), [
    ["Alice", 9, 2, 1], ["Bob", 9, 2, 1], ["Cara", 0, 0, 3],
  ]);
  assert.ok(rows[0].byGame.connections);
  assert.equal(rows[2].byGame.wordle, undefined);
  const cov = gameCoverage(rows);
  assert.deepEqual(cov.find((c) => c.game === "wordle"), { game: "wordle", done: 2, of: 3 });
  assert.deepEqual(cov.find((c) => c.game === "maptap"), { game: "maptap", done: 0, of: 3 });
});

test("week board adds up the days", () => {
  const results = [res("a", "wordle", "2026-11-23", 4), res("a", "wordle", "2026-11-22", 6), res("a", "wordle", "2026-11-15", 6)];
  const { from, to } = periodRange("week", "2026-11-23");
  const rows = buildBoard([A], results, from, to);
  assert.equal(rows[0].total, 4); // 23 Nov 2026 is a Monday: the week has just started
  const sunday = periodRange("week", "2026-11-29");
  assert.deepEqual(sunday, { from: "2026-11-23", to: "2026-11-29" });
  assert.deepEqual(periodRange("today", "2026-11-23"), { from: "2026-11-23", to: "2026-11-23" });
});

test("invite links round-trip and junk is rejected", () => {
  const link = inviteLink("https://apps.trade-bot.uk/preview/dailyquiz", "ABCD2345");
  assert.equal(link, "https://apps.trade-bot.uk/preview/dailyquiz/?join=ABCD2345");
  assert.equal(parseJoinCode(link), "ABCD2345");
  assert.equal(parseJoinCode("abcd2345"), "ABCD2345");
  assert.equal(parseJoinCode("ABCD-2345"), "ABCD2345");
  assert.equal(parseJoinCode("https://x.y/?a=1&join=abcd2345&b=2"), "ABCD2345");
  assert.equal(parseJoinCode("ABCD0345"), null); // 0 isn't in the code alphabet
  assert.equal(parseJoinCode(""), null);
  assert.equal(parseJoinCode(null), null);
});

test("names and initials", () => {
  assert.equal(initials("Alice Smith"), "AS");
  assert.equal(initials(" bob "), "B");
  assert.equal(initials(""), "?");
  assert.equal(cleanName("  Josh   H "), "Josh H");
  assert.equal(cleanName("   "), null);
  assert.equal(cleanName("x".repeat(25)), null);
});
