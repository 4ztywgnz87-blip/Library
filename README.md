# Snug 📚

A cosy little library app: track books (owned, reading, read, wishlist), rate them in quarter stars and
(soon) get personal "what should I read next?" tips. See [PLAN.md](PLAN.md) for the full plan.

Built as a web app (PWA): open it in Safari on iPhone/iPad → Share → **Add to Home Screen**.

## Stack

- React + TypeScript + Vite + Tailwind, `motion` for animations
- Offline-first: everything is stored in the browser (IndexedDB via Dexie) and synced in the background
- Cloudflare Worker (Hono) + D1 database for login and sync; the built app is embedded in the Worker
  (`scripts/embed-assets.mjs`), so everything deploys in one upload

Live: https://snug.snugshelf.workers.dev
- Book data: Google Books + Open Library (free)

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars        # put the allowed email address in it
npm run db:migrate:local
npm run build && npm run dev:api      # app + API on http://localhost:8787
# or, for live reloading while coding, also run `npm run dev` (http://localhost:5173)
```

Without `RESEND_API_KEY`, the login link is printed in the `dev:api` terminal.

## Deploy (free Cloudflare account)

```bash
npx wrangler login                          # or set CLOUDFLARE_API_TOKEN
npm run db:migrate:remote                   # database + account are already in wrangler.jsonc
npx wrangler secret put ALLOWED_EMAIL       # allowed emails, comma-separated; each gets their own library
npx wrangler secret put RESEND_API_KEY      # see "Login emails" below
npm run deploy                              # → https://snug.snugshelf.workers.dev
```

### Login emails

Login works with a 6-digit code by email (typed in the app, so it also works from the iPhone home
screen) plus a link in the same mail. Mail is sent with [Brevo](https://www.brevo.com) (free, 300/day,
only needs a verified sender address, no own domain):

```bash
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put MAIL_FROM           # the verified sender address in Brevo
```

Resend (`RESEND_API_KEY`) also works. Without a mail service, create a link with
`node scripts/login-link.mjs <email>` or in the app under Me → Login link.

### AI (later phases)

`AI_MODE` in `wrangler.jsonc`:

- `mock` (default): free, canned answers, for testing the screens and flow
- `live`: real Claude calls; needs `npx wrangler secret put ANTHROPIC_API_KEY`

`AI_DAILY_LIMIT` caps the number of AI calls per day. Use prepaid credit without auto-reload in the
Anthropic Console, so costs can never exceed what's loaded.

Optional: `VITE_GOOGLE_BOOKS_KEY` (free Google API key) at build time gives Google Books its own quota.
