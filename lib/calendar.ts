import { google } from 'googleapis'

// -- OAuth2 client ------------------------------------------------------------

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  )

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    })
  }

  return client
}

// -- Generate OAuth URL (first-time setup only) -------------------------------

export function getAuthUrl(): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}

// -- Exchange code for tokens (first-time setup only) -------------------------

export async function getTokensFromCode(code: string) {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

// -- Types --------------------------------------------------------------------

export interface CalendarJob {
  id: string
  title: string
  rawTitle: string
  start: string
  end: string
  location?: string
  description?: string
  colorId?: string
  calendarId: string
}

// -- Read today's jobs --------------------------------------------------------

export async function getTodaysJobs(date?: string): Promise<CalendarJob[]> {
  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: 'v3', auth })

  const targetDate = date ? new Date(date) : new Date()
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  const calendarIds = [
    process.env.GOOGLE_CALENDAR_ID || '3A047282-F975-4640-A173-78DE3C453029',
    // Add Odd Jobs calendar ID here when known
  ].filter(Boolean)

  const allJobs: CalendarJob[] = []

  for (const calendarId of calendarIds) {
    try {
      const res = await calendar.events.list({
        calendarId,
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = res.data.items || []

      for (const event of events) {
        if (event.start?.date && !event.start?.dateTime) continue

        const title = event.summary || ''
        if (!title || title.toLowerCase().includes('birthday')) continue

        allJobs.push({
          id: event.id || '',
          title: stripEmoji(title),
          rawTitle: title,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          location: event.location ?? undefined,
          description: event.description ?? undefined,
          colorId: event.colorId ?? undefined,
          calendarId,
        })
      }
    } catch (err) {
      console.error(`Failed to fetch calendar ${calendarId}:`, err)
    }
  }

  return allJobs
}

// -- Update a calendar event --------------------------------------------------

export interface EventUpdate {
  calendarId: string
  eventId: string
  title?: string
  startTime?: string
  endTime?: string
  descriptionAppend?: string
  colorId?: string
}

export async function updateCalendarEvent(update: EventUpdate): Promise<void> {
  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: 'v3', auth })

  const existing = await calendar.events.get({
    calendarId: update.calendarId,
    eventId: update.eventId,
  })

  const event = existing.data
  const currentDescription = event.description || ''

  const patch: Record<string, unknown> = {}

  if (update.title) patch.summary = update.title
  if (update.startTime) patch.start = { dateTime: update.startTime, timeZone: 'Europe/London' }
  if (update.endTime) patch.end = { dateTime: update.endTime, timeZone: 'Europe/London' }
  if (update.colorId) patch.colorId = update.colorId
  if (update.descriptionAppend) {
    patch.description = currentDescription
      ? `${currentDescription}\n\n${update.descriptionAppend}`
      : update.descriptionAppend
  }

  await calendar.events.patch({
    calendarId: update.calendarId,
    eventId: update.eventId,
    requestBody: patch,
  })
}

// -- Create a route summary event ---------------------------------------------

export async function createRouteSummaryEvent(params: {
  date: string
  startTime: string
  endTime: string
  description: string
}): Promise<void> {
  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: 'v3', auth })

  const calendarId = process.env.GOOGLE_CALENDAR_ID || ''
  const title = `WGP Route - ${formatDateShort(params.date)}`

  await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      start: { dateTime: params.startTime, timeZone: 'Europe/London' },
      end: { dateTime: params.endTime, timeZone: 'Europe/London' },
      description: params.description,
      colorId: '7',
    },
  })
}

// -- Extract duration log from event description ------------------------------

export function extractDurationLogs(description: string): number[] {
  const regex = /DURATION LOG: [\d-]+ \| [^|]+ \| [^|]+ \| (\d+) min/g
  const durations: number[] = []
  let match
  while ((match = regex.exec(description)) !== null) {
    durations.push(parseInt(match[1]))
  }
  return durations
}

export function getAverageDuration(logs: number[]): number | null {
  if (!logs.length) return null
  const recent = logs.slice(-3)
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
}

// -- Helpers ------------------------------------------------------------------

function stripEmoji(str: string): string {
  return str.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export { getOAuth2Client }
