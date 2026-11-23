import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfNumber, GameId, Result } from "./games";
import { byDay, gameStats, upsert } from "./stats";

const NOW = new Date("2026-11-23T12:00:00Z"); // wordle 1983, chainle 96

function r(game: GameId, number: number, won: boolean, score: number, points = 1): Result {
  return {
    id: `${game}-${number}`, game, number, day: dayOfNumber(game, number), won, score,
    grid: [], points, addedAt: NOW.toISOString(),
  };
}

test("wordle streaks: a loss breaks it, a missed day breaks it", () => {
  const rs = [
    r("wordle", 1975, true, 3), r("wordle", 1976, true, 4), r("wordle", 1977, true, 2), // run of 3
    r("wordle", 1978, false, 7),
    r("wordle", 1980, true, 5), // gap at 1979
    r("wordle", 1982, true, 4), r("wordle", 1983, true, 3), // current run of 2
  ];
  const s = gameStats(rs, "wordle", NOW);
  assert.equal(s.played, 7);
  assert.equal(s.wins, 6);
  assert.equal(s.winPct, 86);
  assert.equal(s.bestStreak, 3);
  assert.equal(s.currentStreak, 2);
  assert.equal(s.distribution.find((d) => d.label === "X")!.count, 1);
  assert.equal(s.distribution.find((d) => d.label === "4")!.count, 2);
  assert.equal(s.average, (3 + 4 + 2 + 5 + 4 + 3) / 6);
});

test("current streak still counts when today isn't played yet", () => {
  const s = gameStats([r("wordle", 1981, true, 3), r("wordle", 1982, true, 3)], "wordle", NOW);
  assert.equal(s.currentStreak, 2);
  const stale = gameStats([r("wordle", 1980, true, 3)], "wordle", NOW);
  assert.equal(stale.currentStreak, 0);
});

test("chainle streak counts plays, plus average and best", () => {
  const s = gameStats(
    [r("chainle", 94, true, 3000), r("chainle", 95, true, 4600), r("chainle", 96, true, 2000)],
    "chainle", NOW,
  );
  assert.equal(s.currentStreak, 3);
  assert.equal(s.best, 4600);
  assert.equal(s.average, 3200);
});

test("travle distribution buckets", () => {
  const s = gameStats(
    [r("travle", 1437, true, 0), r("travle", 1438, true, 5), r("travle", 1439, false, 2), r("travle", 1440, true, 2)],
    "travle", NOW,
  );
  assert.deepEqual(s.distribution.map((d) => d.count), [1, 0, 1, 0, 1, 1]);
  assert.equal(s.currentStreak, 1);
  assert.equal(s.average, (0 + 5 + 2) / 3);
});

test("empty stats", () => {
  const s = gameStats([], "connections", NOW);
  assert.equal(s.played, 0);
  assert.equal(s.winPct, 0);
  assert.equal(s.average, null);
});

test("byDay groups, orders and totals", () => {
  const days = byDay([
    r("chainle", 96, true, 3450, 3.5), r("wordle", 1983, true, 4, 3), r("wordle", 1982, true, 2, 5),
  ]);
  assert.equal(days.length, 2);
  assert.equal(days[0].day, "2026-11-23");
  assert.deepEqual(days[0].results.map((x) => x.game), ["wordle", "chainle"]);
  assert.equal(days[0].points, 6.5);
});

test("upsert replaces the same puzzle", () => {
  const out = upsert([r("wordle", 1983, true, 5)], [r("wordle", 1983, true, 3), r("wordle", 1982, true, 2)]);
  assert.equal(out.length, 2);
  assert.equal(out.find((x) => x.number === 1983)!.score, 3);
});
