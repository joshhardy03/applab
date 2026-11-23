# App Lab architecture

```
apps/<slug>/          one Expo app per idea (own look + features); app.json sets
                      expo.experiments.baseUrl = "/preview/<slug>" for the web preview
packages/core/        shared plumbing: ads + consent, IAP, analytics, settings, privacy page
dashboard/            Flask app (login, app list, public /preview/<slug>/)
  config.py           APPLAB_* env vars (.env)
  db.py               SQLite (WAL): apps table; phase 2 adds daily stats
  views.py            routes
tests/                pytest (run by deploy.sh and before every commit)
deploy/               deploy.sh, applab-web.service (port 5080), nginx-applab.conf
.github/workflows/    previews.yml: build web previews in CI, publish to `previews`, trigger deploy
data/                 gitignored: applab.db, previews/, deploy.log, secret_key
```

## Deploy flow

1. Push to `main`.
2. GitHub Actions runs `npm ci` (once a root `package.json` exists) and `expo export --platform web` for every `apps/*/app.json`.
3. The output is force-pushed as a single commit to the `previews` branch (history stays one commit deep).
4. The workflow POSTs `{"ref":"refs/heads/main"}` signed with `APPLAB_WEBHOOK_SECRET` to `https://apps.trade-bot.uk/deploy/applab`.
5. `~/webhook.py` checks the HMAC and runs `deploy/deploy.sh`: pull, pip install, pytest, unpack `previews` into `data/previews/`, restart `applab-web`.

Nothing is built on the server. Native Android/iOS builds go through EAS Build (phase 3).

## JS tests and checks

- Pure logic (parsers, stats, dates) lives in plain `.ts` files and is tested with Node's
  test runner via `tsx` (`npm test`). On the server run them without a full install:
  `npx --yes tsx@4.23.15 --test packages/*/src/*.test.ts apps/*/src/*.test.ts`
  (the root `tsconfig.json` maps `@applab/core/dates` so no `node_modules` is needed).
- `npm ci`, typecheck and web export run only in GitHub Actions (Node 22; Expo SDK 58).
- `package-lock.json` is regenerated on the server with
  `systemd-run --user --scope -p MemoryMax=450M npm install --package-lock-only --ignore-scripts`
  (resolves versions without downloading packages).

## Backends for apps

- Apps that need accounts use **Supabase** (free tier), never this server. Each app keeps
  `apps/<slug>/supabase/schema.sql` (idempotent, pasted into the Supabase SQL editor) and
  `test.sql` (access-rule checks). CI job `db-tests` runs both on a throwaway Postgres with a
  stub `auth` schema (`ci-auth-stub.sql`) before any build or deploy.
- The Supabase URL and anon key reach the build as GitHub Actions **variables**
  (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), exposed to Expo as `EXPO_PUBLIC_*`. The service-role
  key is never used by apps or stored anywhere in this project.
