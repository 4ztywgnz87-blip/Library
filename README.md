# Snug 📚

A cosy little library app: track books (owned, reading, read, wishlist), rate them in quarter stars and
(soon) get personal "what should I read next?" tips. See [PLAN.md](PLAN.md) for the full plan.

Built as a web app (PWA): open it in Safari on iPhone/iPad → Share → **Add to Home Screen**.

## Stack

- React + TypeScript + Vite + Tailwind, `motion` for animations
- Offline-first: everything is stored in the browser (IndexedDB via Dexie) and synced in the background
- Cloudflare Worker (Hono) + D1 database for sync; the built app is embedded in the Worker
  (`scripts/embed-assets.mjs`), so everything deploys in one upload

Live: https://snug.snugshelf.workers.dev
- Book data: Google Books + Open Library (free)

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars        # only needed for live AI later
npm run db:migrate:local
npm run build && npm run dev:api      # app + API on http://localhost:8787
# or, for live reloading while coding, also run `npm run dev` (http://localhost:5173)
```

## Deploy (free Cloudflare account)

```bash
npx wrangler login                          # or set CLOUDFLARE_API_TOKEN
npm run db:migrate:remote                   # database + account are already in wrangler.jsonc
npm run deploy                              # → https://snug.snugshelf.workers.dev
```

### No login (for now)

Snug has a single reader, so it opens without logging in. Anyone with the URL can open it.
Earlier login options (email code, password, Face ID) are in the git history if they are wanted later.

### AI (later phases)

`AI_MODE` in `wrangler.jsonc`:

- `mock` (default): free, canned answers, for testing the screens and flow
- `live`: real Claude calls; needs `npx wrangler secret put ANTHROPIC_API_KEY`

`AI_DAILY_LIMIT` caps the number of AI calls per day. Use prepaid credit without auto-reload in the
Anthropic Console, so costs can never exceed what's loaded.

Optional: `VITE_GOOGLE_BOOKS_KEY` (free Google API key) at build time gives Google Books its own quota.
