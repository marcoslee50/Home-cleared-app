# Lifetold — Full-Stack App Framework v2.0

A complete Next.js 14 + FastAPI application for creating lifelike AI video tributes.
Deploys to **Vercel** (frontend) + **Railway** (backend).

---

## Architecture

```
lifetold-app/
├── frontend/                  # Next.js 14 → Vercel
│   └── src/
│       ├── app/
│       │   ├── page.tsx               ← Landing + wizard entry
│       │   ├── layout.tsx             ← Root layout, fonts, toaster
│       │   ├── globals.css            ← Tailwind + grain overlay
│       │   └── tribute/[id]/page.tsx  ← Public shared tribute page
│       ├── components/
│       │   ├── LandingHero.tsx        ← Full-screen dark landing
│       │   ├── WizardShell.tsx        ← 6-step wizard state manager
│       │   ├── ProgressBar.tsx        ← Sticky step progress indicator
│       │   └── steps/
│       │       ├── StepUpload.tsx       ← Photo/video/voice dropzone
│       │       ├── StepPersonDetails.tsx← Name, years, relationship
│       │       ├── StepInterview.tsx    ← 12-question AI interview
│       │       ├── StepStyle.tsx        ← Visual style + tone + music
│       │       ├── StepGenerate.tsx     ← Upload + generate + poll
│       │       └── StepResult.tsx       ← Video player + share + export
│       └── lib/
│           ├── api.ts                 ← Typed backend client
│           └── supabase.ts            ← Supabase auth client
│
└── backend/                   # FastAPI → Railway
    ├── main.py                ← App entry, CORS, router registration
    ├── models.py              ← Pydantic request/response models
    ├── requirements.txt
    ├── railway.toml           ← Railway deployment config
    ├── Procfile               ← Render/Heroku fallback
    ├── routers/
    │   ├── upload.py          ← R2/S3 presigned URL generation
    │   ├── tribute.py         ← Job creation, pipeline, status, share
    │   ├── voice.py           ← ElevenLabs voice management
    │   └── video.py           ← D-ID video status and management
    └── services/
        ├── claude_service.py     ← Narrative generation (Anthropic)
        ├── elevenlabs_service.py ← Voice cloning + synthesis
        └── did_service.py        ← Talking-head video + polling
```

---

## Quick Start

### Frontend
```bash
cd frontend && npm install && cp .env.example .env.local && npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs
```

**Dev mode:** All external APIs have mock fallbacks. No API keys needed for local development.

---

## API Keys

| Key                  | Service       | Purpose                          |
|----------------------|---------------|----------------------------------|
| ANTHROPIC_API_KEY    | Claude        | Narrative script generation      |
| ELEVENLABS_API_KEY   | ElevenLabs    | Voice cloning + speech synthesis |
| DID_API_KEY          | D-ID          | Talking-head video generation    |
| R2_ACCESS_KEY/SECRET | Cloudflare R2 | Media file storage               |
| SUPABASE_URL/KEY     | Supabase      | Database + auth (optional in dev)|

---

## Production Checklist

- [ ] Swap in-memory JOBS dict for Supabase table
- [ ] Set `ALLOWED_ORIGINS` env var on Railway to your Vercel domain(s)
- [ ] Add rate limiting to /tribute/create
- [ ] Add Supabase JWT auth middleware
- [ ] Set up D-ID webhook (avoids polling)
- [ ] Add error monitoring (Sentry)
- [ ] Enable R2 public bucket / custom domain
- [ ] Add Stripe payment flow before launch

---

MIT License · lifetold.co.uk
