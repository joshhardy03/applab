import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfNumber, describe, parseShareText, todayNumber } from "./games";

const NOW = new Date("2026-11-23T12:00:00Z");

const WORDLE = `Wordle 1,983 4/6*

⬛🟨⬛⬛⬛
⬛⬛🟩🟨⬛
🟩🟩🟩⬛⬛
🟩🟩🟩🟩🟩`;

const WORDLE_FAIL = `Wordle 1,982 X/6

⬜⬜⬜⬜⬜
⬜⬜⬜⬜⬜
⬜⬜🟨⬜⬜
⬜⬜🟨⬜⬜
⬜🟩🟨⬜⬜
⬜🟩🟩🟩⬜`;

const CONN_WIN = `Connections
Puzzle #1261
🟨🟨🟨🟨
🟩🟦🟩🟩
🟩🟩🟩🟩
🟦🟦🟦🟦
🟪🟪🟪🟪`;

const CONN_LOSS = `Connections
Puzzle #1260
🟨🟩🟨🟨
🟨🟨🟨🟨
🟦🟪🟦🟦
🟩🟪🟦🟦
🟪🟦🟦🟦`;

const CHAINLE = `Chainle #96 · 3,450 🔗
Beat 72% of players
🟩🟨🟧🟥🟩
https://chainle.io`;

test("puzzle numbering matches each game's start date", () => {
  assert.equal(todayNumber("wordle", NOW), 1983);
  assert.equal(todayNumber("connections", NOW), 1261);
  assert.equal(todayNumber("chainle", NOW), 96);
  assert.equal(dayOfNumber("wordle", 0), "2021-06-19");
  assert.equal(dayOfNumber("connections", 1261), "2026-11-23");
  assert.equal(dayOfNumber("chainle", 1), "2026-08-20");
});

test("wordle win, hard mode", () => {
  const out = parseShareText(WORDLE, NOW);
  assert.ok(out.ok);
  const [r] = out.results;
  assert.equal(r.game, "wordle");
  assert.equal(r.number, 1983);
  assert.equal(r.score, 4);
  assert.equal(r.hard, true);
  assert.equal(r.won, true);
  assert.equal(r.points, 3);
  assert.equal(r.grid.length, 4);
  assert.equal(r.day, "2026-11-23");
  assert.equal(describe(r), "4/6*");
});

test("wordle loss and other number formats", () => {
  const out = parseShareText(WORDLE_FAIL, NOW);
  assert.ok(out.ok);
  assert.equal(out.results[0].won, false);
  assert.equal(out.results[0].points, 0);
  assert.equal(describe(out.results[0]), "X/6");
  for (const t of ["Wordle 1.983 3/6", "Wordle 1 983 3/6", "Wordle 1983 3/6"]) {
    const o = parseShareText(t, NOW);
    assert.ok(o.ok, t);
    assert.equal(o.results[0].number, 1983);
  }
});

test("connections win with one mistake, and a loss", () => {
  const win = parseShareText(CONN_WIN, NOW);
  assert.ok(win.ok);
  assert.equal(win.results[0].won, true);
  assert.equal(win.results[0].score, 1);
  assert.equal(win.results[0].points, 4);
  assert.equal(describe(win.results[0]), "1 mistake");
  const loss = parseShareText(CONN_LOSS, NOW);
  assert.ok(loss.ok);
  assert.equal(loss.results[0].won, false);
  assert.equal(loss.results[0].points, 0);
});

test("chainle points", () => {
  const out = parseShareText(CHAINLE, NOW);
  assert.ok(out.ok);
  const [r] = out.results;
  assert.equal(r.number, 96);
  assert.equal(r.score, 3450);
  assert.equal(r.points, 3.5);
  assert.deepEqual(r.grid, ["🟩🟨🟧🟥🟩"]);
});

test("chainle without a number uses today's puzzle", () => {
  const out = parseShareText("Chainle · 5,000 🔗\n🟩🟩🟩🟩🟩", NOW);
  assert.ok(out.ok);
  assert.equal(out.results[0].number, 96);
});

test("chainle unlimited is rejected", () => {
  const out = parseShareText("Chainle Unlimited · 4,000 🔗\n🟩🟩🟩🟩🟩", NOW);
  assert.equal(out.ok, false);
});

test("all three pasted together", () => {
  const out = parseShareText(`${WORDLE}\n\n${CONN_WIN}\n\n${CHAINLE}`, NOW);
  assert.ok(out.ok);
  assert.deepEqual(out.results.map((r) => r.game), ["wordle", "connections", "chainle"]);
  assert.equal(out.results[0].grid.length, 4);
  assert.equal(out.results[1].grid.length, 5);
});

test("junk, empty and impossible numbers are rejected", () => {
  assert.equal(parseShareText("", NOW).ok, false);
  assert.equal(parseShareText("hello there", NOW).ok, false);
  assert.equal(parseShareText("Wordle 9,999 3/6", NOW).ok, false);
  assert.equal(parseShareText("Connections\nPuzzle #12\nno rows", NOW).ok, false);
});
