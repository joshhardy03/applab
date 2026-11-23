# App Lab

Small mobile apps and games, tried cheaply and kept only if they earn.

- `packages/core/`: shared plumbing (ads, consent, purchases, analytics, settings, privacy page)
- `apps/<slug>/`: one Expo app per idea, each with its own look and features
- `dashboard/`: Flask dashboard at apps.trade-bot.uk (downloads, retention, revenue)
- `deploy/`: deploy script, nginx config, systemd units

Builds run in the cloud (EAS Build for Android/iOS, GitHub Actions for web previews), never on the server.
See `CLAUDE.md` for rules and decisions.
