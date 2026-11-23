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

const WONDERHOP_DAY = `Wonderhop #50 · 1,980/2,800
☁️ 🟩🟩🟨🟩🟧🟩🟩 540
🌊 🟨🟧🟩🟨🟥🟨🟩 410
⏳ 🟩🟨🟩🟩🟨🟩🟧 520
🔮 🟩🟩🟩🟨🟩🟩🟨 510
Can you do better? https://wonderhop.io/?defi=50C540A410P520F510&c=copie`;

const CROWDICT = `Crowdict #40 · 🧍73/100
●●●○●◐●○●●
Crowd Reader
https://crowdict.com/d/40`;

const FERMI = `Fermi · No. 120
01 ↑ 1.80×
02 ↓ 3.20×
03 = 1.00×
04 ↑ 2.50×
05 ↓ 4.10×
─────────
2.34× score · top 12%
fermi.gg`;

const ERALY = `Eraly #39 · I travelled to 1987 AD
▰▰▰▰▰▰▰▰▱▱ 540/700
🟨🟩🟩🟧🟩🟦🟩
https://eraly.io`;

const WHERONAUT = `Wheronaut #54
🌌✈️🌬️🍃⬛🤓🪨
6/7 answered · 5,200 m · Jet Stream
Can you out-climb me?`;

const FARFLUNG = `Farflung · Daily ranked
8400/10000 km
🟨 🟩 🟦 ▫️ 🟩
Find the countries others overlook.`;

const KRILLION = `Krillion #131 🦐
520

🟪🟦⬛🟩🟨🟦🟪`;

const MAPTAP = `www.maptap.gg November 23
93🎯 85🔥 71😊 100🎯 64🙂
Final score: 812`;

test("puzzle numbering matches each game's start date", () => {
  assert.equal(todayNumber("wordle", NOW), 1983);
  assert.equal(todayNumber("connections", NOW), 1261);
  assert.equal(todayNumber("chainle", NOW), 96);
  assert.equal(todayNumber("travle", NOW), 1440);
  assert.equal(dayOfNumber("travle", 1), "2022-12-15");
  assert.equal(todayNumber("wonderhop", NOW), 50);
  assert.equal(todayNumber("crowdict", NOW), 40);
  assert.equal(todayNumber("fermi", NOW), 120);
  assert.equal(todayNumber("eraly", NOW), 39);
  assert.equal(todayNumber("wheronaut", NOW), 54);
  assert.equal(todayNumber("krillion", NOW), 131);
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

function one(text: string) {
  const out = parseShareText(text, NOW);
  assert.ok(out.ok, text);
  assert.equal(out.results.length, 1, text);
  return out.results[0];
}

test("wonderhop: whole day and a single mode", () => {
  const day = one(WONDERHOP_DAY);
  assert.equal(day.game, "wonderhop");
  assert.equal(day.number, 50);
  assert.equal(day.score, 1980);
  assert.equal(day.max, 2800);
  assert.equal(day.points, 3.5);
  assert.equal(describe(day), "1,980/2,800");
  const single = one("Wonderhop #50 · ☁️ Sky 540/700\n🟩🟩🟨🟩🟧🟩🟩");
  assert.equal(single.score, 540);
  assert.equal(single.max, 700);
  const spaced = one("Wonderhop #50 · 1 980/2 800\n☁️ 🟩 540");
  assert.equal(spaced.score, 1980);
});

test("crowdict: crowd and rarest modes; unlimited not counted", () => {
  const r = one(CROWDICT);
  assert.equal(r.game, "crowdict");
  assert.equal(r.number, 40);
  assert.equal(r.score, 73);
  assert.equal(r.points, 3.7);
  assert.equal(describe(r), "🧍73/100");
  const rare = one("Crowdict #40 · Krillion-style · ★ 450\n●●○\nDeep Diver\nhttps://crowdict.com/d/40");
  assert.equal(rare.score, 450);
  assert.equal(describe(rare), "★ 450");
  assert.equal(parseShareText("Crowdict Unlimited · 🧍50/100", NOW).ok, false);
});

test("fermi: factor score, lower is better", () => {
  const r = one(FERMI);
  assert.equal(r.game, "fermi");
  assert.equal(r.number, 120);
  assert.equal(r.score, 2.34);
  assert.equal(r.points, 4.4);
  assert.equal(describe(r), "2.34× off");
  assert.equal(one("Fermi · No. 120\n01 = 1.00×\n─────────\n1.00× score\nfermi.gg").points, 5);
});

test("eraly: score out of 700; archive not counted", () => {
  const r = one(ERALY);
  assert.equal(r.number, 39);
  assert.equal(r.score, 540);
  assert.equal(r.max, 700);
  assert.equal(r.points, 3.9);
  assert.equal(parseShareText("Eraly #20 (Archive) · I travelled to 1900 AD\n▰▱ 300/700", NOW).ok, false);
});

test("wheronaut: metres out of 7,000", () => {
  const r = one(WHERONAUT);
  assert.equal(r.number, 54);
  assert.equal(r.score, 5200);
  assert.equal(r.points, 3.7);
  assert.equal(describe(r), "5,200 m");
});

test("farflung: daily only, filed under today", () => {
  const r = one(FARFLUNG);
  assert.equal(r.game, "farflung");
  assert.equal(r.day, "2026-11-23");
  assert.equal(r.score, 8400);
  assert.equal(r.points, 4.2);
  assert.equal(parseShareText("Farflung · Classic expedition\n5000/10000 km", NOW).ok, false);
});

test("krillion: daily only, out of 700", () => {
  const r = one(KRILLION);
  assert.equal(r.number, 131);
  assert.equal(r.score, 520);
  assert.equal(r.points, 3.7);
  assert.equal(parseShareText("Krillion ⟲ #100 🦐\n400\n\n🟪", NOW).ok, false);
  assert.equal(parseShareText("Krillion ∞ #3 🦐\n400\n\n🟪", NOW).ok, false);
});

test("maptap: dated share, other headers ignored", () => {
  const r = one(MAPTAP);
  assert.equal(r.game, "maptap");
  assert.equal(r.day, "2026-11-23");
  assert.equal(r.score, 812);
  assert.equal(r.points, 4.1);
  const discord = one("<https://maptap.gg> November 22\n90🎯 80🔥 70😊 60🙂 50😐\nFinal score: 700");
  assert.equal(discord.day, "2026-11-22");
  assert.equal(parseShareText("My Castles by Sam\n90🎯 80🔥\nFinal score: 700\nwww.maptap.gg/m/abc", NOW).ok, false);
});

test("last year's date in January is read as last year", () => {
  const jan = new Date("2027-01-02T12:00:00Z");
  const out = parseShareText("www.maptap.gg December 30\n90🎯\nFinal score: 500", jan);
  assert.ok(out.ok);
  assert.equal(out.results[0].day, "2026-12-30");
});

test("all twelve pasted together", () => {
  const all = [WORDLE, CONN_WIN, CHAINLE, TRAVLE, WONDERHOP_DAY, CROWDICT, FERMI, ERALY,
    WHERONAUT, FARFLUNG, KRILLION, MAPTAP].join("\n\n");
  const out = parseShareText(all, NOW);
  assert.ok(out.ok);
  assert.deepEqual(out.results.map((r) => r.game), [
    "wordle", "connections", "chainle", "travle", "wonderhop", "crowdict", "fermi", "eraly",
    "wheronaut", "farflung", "krillion", "maptap",
  ]);
});

test("first four pasted together", () => {
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
