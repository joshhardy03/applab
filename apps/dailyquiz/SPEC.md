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

## Games in v1
| Game | Link | Share text (first line) | Day #1 | Result |
|---|---|---|---|---|
| Wordle | nytimes.com/games/wordle | `Wordle 1,620 4/6*` (`X/6` = loss, `*` = hard mode) | #0 = 2021-06-19 | guesses 1-6 or fail |
| Connections | nytimes.com/games/connections | `Connections` / `Puzzle #900` + 4-8 rows of 4 squares | #1 = 2023-06-12 | groups found, mistakes (4 = loss) |
| Chainle | chainle.io | `Chainle #96 · 3,450 🔗` + 5 squares | #1 = 2026-08-20 (UTC) | points out of 5,000 |

Puzzle numbers come from the share text; "today" is worked out from each game's start date
so the home screen can tick off what's done. A pasted result for an old puzzle is stored
against its own number, not today.

## Daily points (for the combined score and, later, leaderboards)
- Wordle: win in n guesses = 7 − n (6 for a 1-guess win … 1 for a 6-guess win); loss = 0.
- Connections: win = 5 − mistakes (5 … 2); loss = 0.
- Chainle: points ÷ 1,000, rounded to 1 decimal (0 … 5).
- Day total = sum; max 16.

## Screens
1. **Today:** each game with link, done/not done, today's result; day total; "Add result" box.
2. **Stats:** per game: played, win %, current and best streak, average, distribution.
3. **History:** past days, newest first; delete a result.
4. **Friends** (placeholder in v1): explains groups and leaderboards are coming.
5. **Settings:** privacy policy, delete all data, version.

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
