# WGP Route Planner

Daily route planning web app for **Wirral Garden & Property**.

Built with Next.js 14 · Claude AI · Google Calendar API · Vercel.

---

## What it does

- **Plan mode (morning)** — reads Google Calendar, interrogates each job, builds an optimised driving route with Barry rules, generates a schedule table + Barry's Messenger briefing
- **Live mode (during the day)** — log arrivals and completions, update Google Calendar in real time, recalculate remaining route
- **Barry briefing** — copy-ready plain-text message for Facebook Messenger

---

## Setup

```bash
git clone <repo>
cd wgp-route-planner
npm install
cp .env.example .env.local
# Fill in all values
npm run dev
```

See `.env.example` for the full list of required environment variables.

---

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Anthropic Claude API (`claude-sonnet-4-20250514`)
- Google Calendar API v3
- Google Maps JavaScript API
- Vercel KV (duration learning log + invoices)
- Vercel Blob (photos)
- Facebook Graph API v19.0
