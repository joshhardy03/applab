# CLAUDE.md: App Lab

Brief for a new Claude Code session. Josh wrote the goal; the rest comes from a planning chat on 23 Nov 2026, revised the same day after a review against the server. Start in `/home/botuser/applab`.

---

## 1. What this is

A pipeline for trying lots of small mobile apps and games cheaply, then keeping the ones that earn.

1. Josh gives an idea (a sentence or two).
2. Claude writes a one-page spec, then builds the app on a **shared core package** (§5).
3. Josh plays a **web preview** on his phone before anything goes to a store.
4. Good ones go to **Google Play and the App Store**, built and submitted by cloud services.
5. A **dashboard** shows downloads, retention and revenue per app, so losers get dropped and winners get more work.

It's trial and error: expect most apps to earn nothing, and a few to earn something.

---

## 2. Rules (non-negotiable)

- **No app factory.** Apple's spam and minimum-functionality rules (4.3, 4.2) and Google's repetitive-content policy ban near-identical reskins, and a ban can take the whole developer account. Every app must be different and do something real, with its own look, layout and features. Shared code is plumbing only (ads, purchases, analytics, consent, settings), never a shared visible shell. Fewer, better apps.
- **Apps run on the phone, not the server.** The store delivers the built package to each device. The server only hosts the dashboard and serves preview files.
- **No builds on this server, web exports included.** It has 3.8 GB RAM and no swap; Home Assistant and Josh's trading bot run here, and big jobs have starved the bot before (cTrader dropped for 45 min on 11 Nov). On 23 Nov only ~600 MB was available. A Metro web export can use over 1 GB, so:
  - Android and iOS builds run in Expo EAS Build (Codemagic as a fallback).
  - Web previews are built in **GitHub Actions**; the server only downloads the finished static files.
  - `npm install` on the server only when needed for editing/tests, with one shared `node_modules` (npm workspaces). Watch `free -m` first; stop if available memory is under ~800 MB.
- **Disk is tight:** 5.9 GB free (84% full) on 23 Nov after clearing the npm and pip caches. Check `df -h` before installs. Josh allows clearing npm/pip caches when needed. Don't touch `~/.cache/ms-playwright` (used by `~/home-hub`).
- **No own backend for apps.** If an app needs accounts, leaderboards or cloud saves, use Firebase or Supabase free tiers. Never put app traffic on this box.
- **Don't touch other services:** never edit other apps' files (`~/wardrobe`, `~/reseller`, `~/home-hub`, the bot), nginx sites or units. The only shared file this project may change is `~/webhook.py`, by adding one route, copying the existing `/deploy/reseller` route exactly.
- **No secrets in git:** `.env`, store keys, service-account JSON, keystores and `data/` stay gitignored. Never print a key. The GitHub repo is **private**.
- **Outward-facing actions need Josh's OK:** store submissions, publishing, paid services, posting anywhere.
- **Josh's personal details stay private:** never put his name, email or address in code, store metadata or requests unless he says so. Note the stores themselves may display them (see §4.1).
- **Tests before every commit.** Tests never call paid APIs.
- **Honest store listings:** screenshots from the real app, no fake reviews or misleading claims, a privacy policy and correct data-safety and privacy labels for every app. Labels must declare what AdMob and Firebase collect (device IDs, usage data, crash data).
- **Consent and children:** every app with ads shows Google's UMP consent form (UK GDPR applies to UK players) and, on iOS, Apple's App Tracking Transparency prompt before personalised ads. Target audience is set to **13+** deliberately in every listing; nothing aimed at children (avoids Google's Families policy and child-directed ad rules).

---

## 3. Decisions so far

| Topic | Decision |
|---|---|
| App framework | **Expo (React Native, TypeScript)** for apps and simple 2D games: one codebase gives Android, iOS and a web preview; small fixes can ship over the air (EAS Update). |
| Heavier games | **Godot** (free) only if a game needs a real engine. Not in phase 1. |
| Builds and submits | **Expo EAS Build + EAS Submit** (free tier first). |
| Web previews | Built by **GitHub Actions**, downloaded as static files by `deploy.sh`, served by nginx. |
| Ads | **Google AdMob** (`react-native-google-mobile-ads`) with UMP consent. |
| In-app purchases | **RevenueCat** (free until about $2.5k/month revenue). |
| Analytics | **Firebase Analytics** (sessions, day-1 and day-7 retention). |
| Idea testing | Before a store release, try ideas as web builds on **itch.io** (easiest) or CrazyGames (needs its SDK), or as short TikTok gameplay clips. Poki is invite-only. Josh decides what to post. |
| Dashboard | Python Flask + SQLite on this server, same pattern as `~/reseller`, at `apps.trade-bot.uk`. |
| Release region | UK and US first (skips the EU's public trader-address requirement); EU later if Josh is happy to be listed as a trader. |
| Platforms | **Android first.** Josh has only a Samsung phone (no iPhone, no Mac), so iOS can't be tested on a device. Apple account and iOS releases wait until there's an iPhone to test on; keep code iOS-ready. |
| Previews | **Public** at `apps.trade-bot.uk/preview/<slug>/` (no login), served by Flask from `data/previews/` (nginx can't read `/home/botuser`). |
| Bundle id | **`uk.tradebot.<slug>`** (Josh left it to Claude, 23 Nov). Matches the owned domain; never visible to players. Permanent once published. |
| Play store account | Personal vs company: Josh decides after the first proof of concept. |

### Open decisions (ask Josh)

| Topic | Question |
|---|---|
| Account type | **Personal or company** developer accounts? Personal: Apple shows his legal name as seller; Google may show his address publicly once an app has ads or IAP (check current rule). Company (a Ltd + free D-U-N-S number) avoids both and, on Google, skips the closed-test requirement. Hard to switch later, so decide before paying. |

---

## 4. Josh does these (needs his ID and payment details)

1. **Google Play developer account** ($25 one-off). New **personal** accounts must run a **closed test with 12 testers for 14 days** before going to production. This likely applies **per app**, not once per account: verify before planning release timing. Organisation accounts are exempt.
2. **Apple Developer Program** (about £79/year): **deferred** until there's an iPhone to test on.
3. **Expo account**, then give the session an `EXPO_TOKEN` in `.env` (and as a GitHub Actions secret).
4. **AdMob** and **RevenueCat** accounts, and a **Firebase** project. AdMob API access needs a one-off OAuth sign-in by Josh (no service account).
5. Tax and bank details on both stores. App income counts as trading income (like the reselling).
6. Answer the open decisions in §3.

The session can start phases 1–2 before any of this exists.

---

## 5. Phases

### Phase 1: core package and first app (no store accounts needed)
- Monorepo with **npm workspaces** (one shared `node_modules`):
  - `packages/core/`: shared plumbing imported by every app, not copied: ads wrapper (off in dev, test ads only until Josh approves real ones), UMP consent + iOS ATT, IAP wrapper, analytics wrapper, settings screen, privacy policy page.
  - `apps/<slug>/`: one folder per app, with its own screens, look and assets.
- Every wrapper in `core` must **no-op on web**: AdMob, RevenueCat and Firebase native modules don't run in the web preview or Expo Go.
- `./lab new <slug>` creates a minimal app skeleton that depends on `core`, with a fresh bundle id (see open decisions), plus icon/splash generation and a store-listing text file.
- Build a **first small game** from Josh's next idea (or propose 3 ideas if he has none) as the test case.
- **Web preview** (gameplay only): GitHub Actions runs `npx expo export --platform web` per app and publishes the output as a build artifact/release; `deploy.sh` downloads it into `data/previews/<slug>/`, served under `apps.trade-bot.uk/preview/<slug>/`.
- **Native testing** (ads, purchases, analytics): EAS internal-distribution Android APK installed directly on Josh's Samsung. iOS testing (TestFlight) later.

### Phase 2: dashboard
- Flask app on port **5080** (free as of 23 Nov 2026; check `ss -ltn` first), behind a login like the reseller app.
- Table per app: status (idea / building / preview / testing / live / dropped), downloads, DAU, day-1 and day-7 retention, ad revenue, IAP revenue, revenue per user, cost (dev fees, any paid tools), profit.
- Daily import job (systemd timer) once accounts exist:
  - **AdMob API** for ad earnings per app (OAuth refresh token from Josh's one-off sign-in);
  - **RevenueCat API** for purchases;
  - **App Store Connect API** sales and trends reports for iOS downloads and proceeds;
  - **Google Play** stats from the Play Console Cloud Storage bucket (installs) via a service account; these lag a few days;
  - **Firebase / GA4 Data API** for sessions and retention.
- Until those exist, allow manual entry so the dashboard is useful from day one.
- Simple "kill or keep" view: apps with no traction after N days flagged for dropping.

### Phase 3: store pipeline
- `eas.json` per app; `./lab build <slug>` and `./lab submit <slug>` wrap EAS (submissions only with Josh's OK each time).
- Store listing generated from the spec: title, short and long description, keywords, screenshots taken from the real app.
- Checklist per release: privacy policy URL, data-safety form (AdMob + Firebase declared), content rating, age rating / target audience 13+, ads declaration, consent form working, closed-test status (Google personal accounts).

---

## 6. Server, deploy and DNS

Copy the `~/reseller` pattern (read `~/reseller/CLAUDE.md` §12–13 and `~/reseller/deploy/`; copy, never import):
- **Flow:** push to `main` → GitHub Actions (`.github/workflows/previews.yml`) exports every app's web preview, force-pushes them as one commit to the `previews` branch, then POSTs a signed request to `/deploy/applab` → `~/webhook.py` runs `deploy/deploy.sh`. There is **no GitHub repo webhook**: the workflow is the only trigger, so deploys always see finished previews.
- `deploy/deploy.sh`: refuses on uncommitted changes, `git pull --ff-only`, installs Python deps, runs tests, unpacks the `previews` branch into `data/previews/` (never builds), restarts `applab-web`, logs to `data/deploy.log`.
- `~/webhook.py`: `/deploy/applab` route added 23 Nov (copy of the reseller route; backup at `~/webhook.py.bak-applab`). `APPLAB_WEBHOOK_SECRET` is in `~/.webhook_secrets.env` and must also be a GitHub Actions secret of the same name.
- `deploy/nginx-applab.conf` copied from the reseller one: `server_name apps.trade-bot.uk`, proxy to `127.0.0.1:5080`, Cloudflare origin certificate, `/preview/` served as static files from `data/previews/`.
- Josh runs the one-off `sudo` steps (units, nginx site, sudoers line) and adds the Cloudflare **A record `apps` → `178.105.87.94`, proxied**. Write those commands out for him exactly, like reseller §12–13.
- 1 gunicorn worker.

### Josh runs these once
```bash
sudo cp /home/botuser/applab/deploy/applab-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now applab-web
sudo cp /home/botuser/applab/deploy/nginx-applab.conf /etc/nginx/sites-available/applab
sudo ln -sf /etc/nginx/sites-available/applab /etc/nginx/sites-enabled/applab
sudo nginx -t && sudo systemctl reload nginx
echo 'botuser ALL=(ALL) NOPASSWD: /bin/systemctl restart applab-web' | sudo tee /etc/sudoers.d/applab && sudo chmod 440 /etc/sudoers.d/applab && sudo visudo -cf /etc/sudoers.d/applab
sudo systemctl restart webhook
```
Then GitHub → repo → Settings → Secrets and variables → Actions → New repository secret `APPLAB_WEBHOOK_SECRET` (value: `grep APPLAB_WEBHOOK_SECRET ~/.webhook_secrets.env | cut -d= -f2`). Dashboard password: `grep APPLAB_PASSWORD ~/applab/.env | cut -d= -f2`.

---

## 7. Realistic expectations (tell Josh honestly as numbers come in)

- Discovery is the hard part; most new apps get close to zero organic downloads.
- UK ad income for a casual game is roughly £3–15 a day per 1,000 daily players.
- Judge each app on day-1 retention first (casual games: 35%+ is good, under 25% is usually a drop).
- If the Google closed test is per app, each Android release on a personal account starts with a two-week wait.

---

## 8. First steps for the session

1. Read this file and `~/reseller/CLAUDE.md` (for house style and deploy pattern).
2. `git init`, `.gitignore` (`.env`, `data/`, `node_modules/`, keystores, `*.p8`, `*.json` service accounts), README. Private GitHub repo.
3. Done 23 Nov: git repo (private, `joshhardy03/applab`), `.gitignore`, README, minimal dashboard (login, app list, public previews), deploy files, preview workflow, webhook route. Node 20.20 / npm 10.8 are installed. Check `free -m` and `df -h` before any `npm install`.
4. Ask Josh the open decisions in §3 and for his first idea (or offer 3), then do phase 1.
5. Keep an `ARCHITECTURE.md` and update this file when decisions change.
