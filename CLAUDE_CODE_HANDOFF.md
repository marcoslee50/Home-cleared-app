# LIFETOLD — Claude Code Handoff Document
# Version 2.0 | April 2026

This file is a deployment runbook for taking the existing Lifetold codebase from
the local working tree to production on Vercel (frontend) + Railway (backend).

The full content of the original handoff document is preserved in this repository's
git history; this file is a slim deployment-focused checklist.

---

## Stack

- **Frontend** — Next.js 14, TypeScript, Tailwind, Framer Motion → Vercel
- **Backend**  — FastAPI (Python 3.11), async background tasks → Railway
- **Services** — Anthropic Claude, ElevenLabs, D-ID, Cloudflare R2, Supabase

The app is a 6-step wizard. The backend MUST run as a persistent process —
serverless functions time out long before D-ID generation finishes.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: Lifetold v2.0 — complete app framework"

# Create private repo (requires GitHub CLI or PAT)
gh repo create life-told --private --source=. --remote=origin --push
```

---

## Step 2 — Supabase

1. Create project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. Grab the URL, anon key (frontend), and service role key (backend).

---

## Step 3 — Cloudflare R2

```bash
wrangler r2 bucket create lifetold-media
```

Set CORS in the R2 console to allow your Vercel domain + `http://localhost:3000`.
Create an R2 API token with read/write on the bucket.

---

## Step 4 — Deploy backend to Railway

```bash
npm install -g @railway/cli
railway login
cd backend && railway init && railway up
```

Set env vars in Railway dashboard:

```
ANTHROPIC_API_KEY        = sk-ant-...
ELEVENLABS_API_KEY       = ...
DID_API_KEY              = Basic ...
R2_ACCESS_KEY            = ...
R2_SECRET_KEY            = ...
R2_BUCKET                = lifetold-media
R2_ENDPOINT              = https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_URL            = https://media.lifetold.co.uk
SUPABASE_URL             = https://your-project.supabase.co
SUPABASE_SERVICE_KEY     = eyJ...
ENVIRONMENT              = production
APP_URL                  = https://lifetold.co.uk
ALLOWED_ORIGINS          = https://lifetold.co.uk,https://www.lifetold.co.uk
```

Verify: `curl https://<railway-url>/health` returns `{"status":"ok",...}`.

---

## Step 5 — Deploy frontend to Vercel

```bash
npm install -g vercel
cd frontend && vercel
```

Set env vars in Vercel dashboard:

```
NEXT_PUBLIC_BACKEND_URL       = https://<railway-url>
BACKEND_URL                   = https://<railway-url>
NEXT_PUBLIC_SUPABASE_URL      = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
NEXT_PUBLIC_APP_URL           = https://lifetold.co.uk
```

Then `vercel --prod` and connect to GitHub for auto-deploys.

---

## Production hardening still TODO

- Add Stripe Checkout before public launch (no payment gate yet).
- Replace polling with D-ID webhooks.
- Add rate limiting (slowapi) on `/tribute/create`.
- Add Sentry for error monitoring.
- Wire D-ID/ElevenLabs webhooks instead of polling.
