# WGP Route Planner

Daily route planning web app for **Wirral Garden & Property**.

Built with Next.js 14, Claude AI, Google Calendar API, Vercel.

## What it does

- **Plan mode (morning)** - reads your Google Calendar, interrogates each job, builds an optimised driving route with Barry rules, generates a schedule table + Barry's Messenger briefing
- **Live mode (during the day)** - log arrivals and completions, updates Google Calendar in real time, recalculates remaining route
- **Barry briefing** - copy-ready plain-text message for Facebook Messenger
- **GPS geofencing** - auto-detects arrival at job sites (150m radius), fires notification, auto-logs time
- **Photo capture** - before/after photos to Vercel Blob
- **Facebook posting** - one-tap post to WGP Facebook Page after each job
- **End-of-day report** - performance metrics, estimate accuracy, photo count, invoice prompts
- **Invoice system** - PDF generation, WhatsApp delivery, bank transfer details, overdue tracking

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values - see `.env.example` for the full list.

### 3. Google Cloud setup

1. Go to console.cloud.google.com
2. Create project: `WGP Route Planner`
3. Enable APIs: Google Calendar API, Maps JavaScript API, Places API, Geocoding API, Distance Matrix API
4. Create OAuth 2.0 credentials (Web application)
   - Redirect URI: `http://localhost:3000/api/auth/callback`
   - Redirect URI: `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback`
5. Create API key for Maps (restrict to those 5 APIs)
6. OAuth consent screen - add yourself as a test user

### 4. Get your Google refresh token

```bash
npm run dev
```

Visit `http://localhost:3000/api/auth/google`, complete OAuth, copy the refresh token to `.env.local` as `GOOGLE_REFRESH_TOKEN`.

### 5. Vercel KV + Blob

In the Vercel dashboard: Storage > Create > KV (link to project), Storage > Create > Blob (link to project). Env vars auto-populate.

### 6. Verify build

```bash
npx next build
```

## Deploy

Push to GitHub, import the repo in Vercel, add all env vars, deploy. Every push to `main` auto-deploys.

## Calendar format

Jobs in the **Wirral Garden & Property** Google Calendar:
- **Title**: Client name (emojis are added automatically by the planner)
- **Location**: Full address with postcode
- **Description**: Job details, price (£XX), special notes

## Barry rules

- Barry does not drive - always travels with Marcos
- Barry can only be left solo on jobs <=30 min estimated
- Default drop-off: New Brighton by 15:00
- Never assigned solo to jobs >=45 min

## Tech stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Anthropic Claude API (`claude-sonnet-4-20250514`), Google Calendar API v3, Google Maps JavaScript API, Vercel KV, Vercel Blob, Vercel.
