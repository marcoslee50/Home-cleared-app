import Anthropic from '@anthropic-ai/sdk'
import { CalendarJob } from './calendar'

const client = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanningContext {
  jobs: CalendarJob[]
  startTime: string
  barryWorking: boolean
  barryDropoff?: string
  barryStartTime?: string
  startLocation: string
  specialTools?: string
  date: string
}

export interface ScheduledJob {
  id: string
  clientName: string
  address: string
  jobType: string
  emoji: string
  price?: number
  priceTbc: boolean
  estimatedDuration: number
  operative: 'marcos' | 'barry' | 'both'
  scheduledArrival: string
  scheduledEnd: string
  flags: string[]
  tools: string[]
  notes: string
  sequence: number
}

export interface DayPlan {
  date: string
  startTime: string
  estimatedFinish: string
  jobs: ScheduledJob[]
  confirmedRevenue: number
  tbcRevenue: number
  totalJobTime: number
  totalTravelTime: number
  flags: string[]
  barryDropoffTime?: string
  barrySummary: string
}

// ── Mode A: Build the day plan ────────────────────────────────────────────────

export async function buildDayPlan(ctx: PlanningContext): Promise<DayPlan> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildPlanningPrompt(ctx)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return parseDayPlan(content.text)
}

// ── Mode B: Update after job completion ───────────────────────────────────────

export interface JobUpdate {
  jobId: string
  clientName: string
  arrivedAt?: string
  finishedAt?: string
  actualDuration?: number
  notes?: string
  photosTaken?: boolean
}

export interface UpdateResult {
  updatedJob: Partial<ScheduledJob>
  remainingJobs: ScheduledJob[]
  status: 'on-schedule' | 'behind' | 'ahead'
  minutesDiff: number
  newEstimatedFinish: string
  barryStatus: 'ok' | 'at-risk' | 'safe'
  durationLogLine: string
  summary: string
}

export async function processJobUpdate(
  update: JobUpdate,
  currentPlan: DayPlan,
  currentTime: string
): Promise<UpdateResult> {
  const prompt = buildUpdatePrompt(update, currentPlan, currentTime)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return parseUpdateResult(content.text)
}

// ── Barry briefing generator ──────────────────────────────────────────────────

export async function generateBarryBriefing(plan: DayPlan): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Generate a Barry briefing for Facebook Messenger from this day plan.

Barry is my casual labourer. He doesn't need prices, client surnames, or exact details.
Keep it friendly, plain English, no markdown, no bullet points — just short paragraphs.
Include: pickup time, each job in order with rough time and what we're doing (broad strokes),
drop-off time, and a note about what to wear/bring if relevant.

Day plan:
${JSON.stringify(plan, null, 2)}

Write the Messenger message now. Start with "Morning Barry!" — keep it brief and readable on a phone.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return 'Error generating Barry briefing'
  return content.text
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the WGP Route Planner — the AI brain for Wirral Garden & Property, a garden maintenance and property services business on the Wirral Peninsula.

Your job is to turn a list of calendar jobs into an optimised, timed, mapped day schedule for Marcos Lee (the owner and sole driver) and sometimes Barry McCardle (casual labourer, based in New Brighton, does not drive).

RULES YOU MUST ALWAYS FOLLOW:
- Barry does not drive. Marcos is the only driver. They always travel together.
- Barry can only be left solo if the job is ≤30 minutes estimated duration.
- Barry must be back in New Brighton by his confirmed drop-off time (default 15:00).
- Never assign Barry solo to a job estimated at 45+ minutes.
- After Barry's last job, flag: "🏠 Drop Barry — New Brighton ~HH:MM" then Marcos continues solo.
- Insert materials pickups EN ROUTE — never as detours.
- Allow 15 min travel buffer between jobs unless jobs are very close.
- Group jobs geographically — minimise backtracking, sweep south then north.
- Revenue with no confirmed price is marked TBC — still estimate a range.
- ALWAYS remind Marcos to take before/after photos at every job.

DURATION ESTIMATES (use logged actuals if available in event description):
- Regular maintenance small: 45 min solo / 30 min with Barry
- Regular maintenance medium: 60–75 min solo / 40–50 min with Barry
- Lawn mowing only: 30–45 min solo / 20–30 min with Barry
- Borders/edging: 60–90 min solo / 45–60 min with Barry
- Turfing: 90–120 min solo / 60–80 min with Barry
- Hedge cutting: 60–90 min solo / 45–60 min with Barry
- Clearance/one-off: 60–90 min solo / 45–60 min with Barry
- Hard landscaping/gates/fencing: 120–180 min solo / 90–120 min with Barry
- Quote visit: 20–30 min (either)
- Unknown: 60 min solo / 45 min with Barry

EMOJI KEY (prepend to job titles in calendar):
Garden: 🌿 maintenance | 🪴 planting | 🌱 turfing | ✂️ hedges/pruning | 🍂 clearance | 🪏 digging | 💧 irrigation | 🌳 tree work
Property: 🏠 general | 🚪 gates | 🧱 hard landscaping | 🪵 fencing | 🪟 windows | 🎨 painting | 🔧 repairs | 🚛 skip/waste
Admin: 📞 call | 📄 quote | 💰 invoice | 📸 photos | 🗺️ route summary | ⚠️ flag

You MUST respond with valid JSON only. No markdown, no explanation outside the JSON structure.`
}

function buildPlanningPrompt(ctx: PlanningContext): string {
  return `Build today's route plan for ${ctx.date}.

START TIME: ${ctx.startTime}
START LOCATION: ${ctx.startLocation}
BARRY WORKING: ${ctx.barryWorking}
${ctx.barryWorking ? `BARRY DROP-OFF BY: ${ctx.barryDropoff || '15:00'}` : ''}
${ctx.barryWorking ? `BARRY START TIME: ${ctx.barryStartTime || ctx.startTime}` : ''}
SPECIAL TOOLS/MATERIALS: ${ctx.specialTools || 'none'}

TODAY'S JOBS (from Google Calendar):
${JSON.stringify(ctx.jobs, null, 2)}

Return a JSON object matching this exact structure:
{
  "date": "string",
  "startTime": "HH:MM",
  "estimatedFinish": "HH:MM",
  "jobs": [
    {
      "id": "calendar_event_id",
      "clientName": "string",
      "address": "string",
      "jobType": "string",
      "emoji": "string",
      "price": number_or_null,
      "priceTbc": boolean,
      "estimatedDuration": number_in_minutes,
      "operative": "marcos|barry|both",
      "scheduledArrival": "HH:MM",
      "scheduledEnd": "HH:MM",
      "flags": ["array of warning strings"],
      "tools": ["array of tools/materials needed"],
      "notes": "string",
      "sequence": number_starting_at_1
    }
  ],
  "confirmedRevenue": number,
  "tbcRevenue": number,
  "totalJobTime": number_in_minutes,
  "totalTravelTime": number_in_minutes,
  "flags": ["array of day-level flags"],
  "barryDropoffTime": "HH:MM or null",
  "barrySummary": "plain English Messenger message for Barry — no markdown, no prices, no surnames"
}`
}

function buildUpdatePrompt(update: JobUpdate, plan: DayPlan, currentTime: string): string {
  return `Process this live job update for WGP.

CURRENT TIME: ${currentTime}
CURRENT DAY PLAN: ${JSON.stringify(plan, null, 2)}
UPDATE: ${JSON.stringify(update, null, 2)}

Return a JSON object:
{
  "updatedJob": { partial ScheduledJob with actual times },
  "remainingJobs": [ updated remaining ScheduledJob array with recalculated times ],
  "status": "on-schedule|behind|ahead",
  "minutesDiff": number,
  "newEstimatedFinish": "HH:MM",
  "barryStatus": "ok|at-risk|safe",
  "durationLogLine": "⏱ DURATION LOG: YYYY-MM-DD | Marcos/Barry/Both | job_type | actual_mins min",
  "summary": "2–3 sentence plain English summary of what was logged and current status"
}`
}

// ── Response parsers ──────────────────────────────────────────────────────────

function parseDayPlan(text: string): DayPlan {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean) as DayPlan
  } catch (err) {
    console.error('Failed to parse day plan:', text)
    throw new Error('AI returned invalid JSON for day plan')
  }
}

function parseUpdateResult(text: string): UpdateResult {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean) as UpdateResult
  } catch (err) {
    console.error('Failed to parse update result:', text)
    throw new Error('AI returned invalid JSON for update result')
  }
}
