# Daily Quiz Tracker (`dailyquiz`, `uk.tradebot.dailyquiz`)

Working name. One place to track the daily word puzzles you already play, keep your
stats, and (later) compete with friends.

## What it is (and isn't)
- Lists today's puzzles with a link to each. Tapping opens the **real game** in the browser
  or its own app. We never embed, copy or reskin the games (IP + store rules; see CLAUDE.md §2).
- After playing, the user taps the game's own **Share** button and brings the result here:
  paste (or "Paste from clipboard"); later, the Android share sheet (needs a native build).
- The app parses the share text, stores the result and shows stats.
- No game logos or trademarked names in the app name or icon. Game names appear only as
  plain text labels so users know which puzzle a link opens.

## Games (Travle, then eight more, added 23 Nov at Josh's request)
| Game | Link | Share text (first line) | Day #1 | Result |
|---|---|---|---|---|
| Wordle | nytimes.com/games/wordle | `Wordle 1,620 4/6*` (`X/6` = loss, `*` = hard mode) | #0 = 2021-06-19 | guesses 1-6 or fail |
| Connections | nytimes.com/games/connections | `Connections` / `Puzzle #900` + 4-8 rows of 4 squares | #1 = 2023-06-12 | groups found, mistakes (4 = loss) |
| Chainle | chainle.io | `Chainle #96 · 3,450 🔗` + 5 squares | #1 = 2026-08-20 (UTC) | points out of 5,000 |
| Travle | travle.earth | `#travle #1440 (hard mode) +2 (1 hint)` or `#travle #1440 (3 away)` + ✅🟩🟧🟥 row | #1 = 2022-12-15 | extra guesses over shortest route, or countries away |
| Wonderhop | wonderhop.io | `Wonderhop #50 · 1,980/2,800` (whole day) or `Wonderhop #50 · ☁️ Sky 540/700` (one mode) | #1 = 2026-10-05 (Montreal time) | points out of max |
| Crowdict | crowdict.com | `Crowdict #40 · 🧍73/100` or `Crowdict #40 · Krillion-style · ★ 450` | #1 = 2026-10-15 | crowd /100; rarest ★ (max assumed 1,000) |
| Fermi | fermi.gg | `Fermi · No. 120` … `2.34× score · top 12%` | #1 = 2026-07-27 (New York time) | average factor off (lower is better) |
| Eraly | eraly.io | `Eraly #39 · I travelled to 1987 AD` / `▰▰▱ 540/700` | #1 = 2026-10-16 | points out of 700 |
| Wheronaut | wheronaut.com | `Wheronaut #54` / emojis / `6/7 answered · 5,200 m · …` | #1 = 2026-10-01 (UTC) | metres out of 7,000 |
| Farflung | farflunggame.fun | `Farflung · Daily ranked` / `8400/10000 km` (no number) | filed under today | km out of max |
| Krillion | krillion.io | `Krillion #131 🦐` / `520` / tier squares | #1 = 2026-07-16 (New York time) | points out of 700 |
| MapTap | maptap.gg | `www.maptap.gg November 23` / round scores / `Final score: 812` (dated, no number) | filed under that date | final score (max assumed 1,000) |

Not counted: practice, archive, unlimited and other-map modes (Chainle Unlimited, `#travle_usa`,
`Krillion ⟲`/`∞`, `Eraly … (Archive)`, `Crowdict Unlimited`, Farflung non-daily modes, MapTap
player maps). Share formats were read from each game's own site code on 23 Nov 2026; if a game
changes its share text, its parser and tests in `src/games.ts` need updating.

Puzzle numbers come from the share text; "today" is worked out from each game's start date
so the home screen can tick off what's done. A pasted result for an old puzzle is stored
against its own number, not today.

## Daily points (for the combined score and, later, leaderboards)
- Wordle: win in n guesses = 7 − n (6 for a 1-guess win … 1 for a 6-guess win); loss = 0.
- Connections: win = 5 − mistakes (5 … 2); loss = 0.
- Chainle: points ÷ 1,000, rounded to 1 decimal (0 … 5).
- Travle (world map only; `#travle_usa` etc. and practice don't count): win = 5 − extra guesses − hints, minimum 1; loss = 0.
- Scored games (Wonderhop, Crowdict, Eraly, Wheronaut, Farflung, Krillion, MapTap): 5 × score ÷ max, 1 decimal.
- Fermi: 5 × (1 − log10(factor) ÷ 3), so 1× = 5, 10× ≈ 3.3, 1,000× = 0.
- Day total = sum; max 61.

## Screens
1. **Today:** each game with link, done/not done, today's result; day total; "Add result" box.
2. **Stats:** per game: played, win %, current and best streak, average, distribution.
3. **History:** past days, newest first; delete a result.
4. **Friends** (placeholder in v1): explains groups and leaderboards are coming.
5. **Settings:** privacy policy, delete all data, version.

## v0.2 (23 Nov 2026): accounts, groups, leaderboard, reminders, new UI
- Supabase backend: schema + row-level security in `supabase/schema.sql`, checked in CI by
  `supabase/test.sql` on a throwaway Postgres. Sign-up = name + colour (anonymous auth).
- Groups with invite link (`/preview/dailyquiz/?join=CODE`) or code; today's board shows each
  member's result per game; weekly totals; nudge; leave. Global leaderboard (today / week).
- Daily reminder notification on phones. Live once Josh creates the Supabase project and sets
  the `SUPABASE_URL` and `SUPABASE_ANON_KEY` GitHub Actions variables; until then the app runs
  on-device only and shows "Accounts aren't switched on yet".
- Known limits: anonymous accounts are tied to the device (no email recovery yet); scores
  are self-reported.

## Phase plan
- **v1 (this POC):** everything stored on the phone (AsyncStorage; localStorage on web).
  No accounts, no network calls except opening game links.
- **v2:** Supabase (free tier): sign-in, friend groups via invite link, daily/weekly group
  leaderboard, global board (self-reported, so secondary). Needs Josh's Supabase project.
  Account deletion in-app (Apple rule).
- **v3:** Android share-sheet target, reminders, ads (banner on Stats/History only), optional
  paid upgrade (more groups, deeper stats).

## Done when (v1)
- Pasting real share text for each game records the right result; junk text is rejected
  with a clear message; duplicates (same game + puzzle) replace the old entry.
- Stats are correct for streaks across missed days.
- Web preview works on Josh's Samsung at apps.trade-bot.uk/preview/dailyquiz/.
