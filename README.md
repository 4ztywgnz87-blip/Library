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

### AI

Used for reading a cover photo (Claude Haiku 5.5), What's next tips, the bookshop fit check and full
series lists (Claude Sonnet 5.5, with server-side refusal fallback). Code: `worker/ai.ts`.

`AI_MODE` in `wrangler.jsonc`:

- `mock` (default): free, canned answers, for testing the screens and flow
- `live`: real Claude calls; needs `npx wrangler secret put ANTHROPIC_API_KEY`, then `npm run deploy`

Answers are cached in D1 (`ai_cache`), so the same question twice only costs once.

`AI_DAILY_LIMIT` caps the number of AI calls per day. Use prepaid credit without auto-reload in the
Anthropic Console, so costs can never exceed what's loaded.

Recommended: a free Google Books API key, so search (especially Dutch titles) and edition covers never
hit Google's shared rate limit. Create one in Google Cloud Console (enable "Books API"), then
`npx wrangler secret put GOOGLE_BOOKS_KEY` and deploy. The app calls Google directly first and falls
back to the server (`/api/gbooks`, cached) which uses this key. Open Library has the same fallback
(`/api/olsearch`) and needs no key.
