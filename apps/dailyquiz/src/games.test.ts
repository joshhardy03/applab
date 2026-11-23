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

const TRAVLE = `#travle #1440 +2
✅🟩✅🟧✅
https://travle.earth`;

test("puzzle numbering matches each game's start date", () => {
  assert.equal(todayNumber("wordle", NOW), 1983);
  assert.equal(todayNumber("connections", NOW), 1261);
  assert.equal(todayNumber("chainle", NOW), 96);
  assert.equal(todayNumber("travle", NOW), 1440);
  assert.equal(dayOfNumber("travle", 1), "2022-12-15");
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

test("travle win, perfect, hints, hard mode and loss", () => {
  const win = parseShareText(TRAVLE, NOW);
  assert.ok(win.ok);
  const [r] = win.results;
  assert.equal(r.game, "travle");
  assert.equal(r.number, 1440);
  assert.equal(r.won, true);
  assert.equal(r.score, 2);
  assert.equal(r.points, 3);
  assert.deepEqual(r.grid, ["✅🟩✅🟧✅"]);
  assert.equal(describe(r), "+2");

  const perfect = parseShareText("#travle #1440 +0 (Perfect)\n✅✅✅\nhttps://travle.earth", NOW);
  assert.ok(perfect.ok);
  assert.equal(perfect.results[0].points, 5);
  assert.equal(describe(perfect.results[0]), "Perfect");

  const hard = parseShareText("#travle #1439 (hard mode) +1 (2 hints)\n✅🟧✅", NOW);
  assert.ok(hard.ok);
  assert.equal(hard.results[0].hard, true);
  assert.equal(hard.results[0].hints, 2);
  assert.equal(hard.results[0].points, 2);
  assert.equal(describe(hard.results[0]), "+1, 2 hints");

  const loss = parseShareText("#travle #1440 (3 away)\n🟥🟧🟥🟥🟥🟥🟥🟥🟥🟥🟥\nhttps://travle.earth", NOW);
  assert.ok(loss.ok);
  assert.equal(loss.results[0].won, false);
  assert.equal(loss.results[0].score, 3);
  assert.equal(loss.results[0].points, 0);
  assert.equal(describe(loss.results[0]), "3 away");
});

test("travle other maps and practice are not counted", () => {
  assert.equal(parseShareText("#travle_usa #900 +1\n✅🟩", NOW).ok, false);
  assert.equal(parseShareText("#travle_practice +1\n✅🟩", NOW).ok, false);
});

test("all four pasted together", () => {
  const out = parseShareText(`${WORDLE}\n\n${CONN_WIN}\n\n${CHAINLE}\n\n${TRAVLE}`, NOW);
  assert.ok(out.ok);
  assert.deepEqual(out.results.map((r) => r.game), ["wordle", "connections", "chainle", "travle"]);
  assert.equal(out.results[0].grid.length, 4);
  assert.equal(out.results[1].grid.length, 5);
});

test("junk, empty and impossible numbers are rejected", () => {
  assert.equal(parseShareText("", NOW).ok, false);
  assert.equal(parseShareText("hello there", NOW).ok, false);
  assert.equal(parseShareText("Wordle 9,999 3/6", NOW).ok, false);
  assert.equal(parseShareText("Connections\nPuzzle #12\nno rows", NOW).ok, false);
});
