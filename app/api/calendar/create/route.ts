import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/calendar'

// Create a tentative calendar event from a quote acceptance.
// Used by Addition 4 (Quote Builder) when Marcos taps "Convert to Calendar Job".
//
// Body:
//   {
//     clientName, address, serviceLabel, emoji, price,
//     scopeNotes, startISO, endISO
//   }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clientName,
      address,
      serviceLabel,
      emoji = '📄',
      price,
      scopeNotes,
      startISO,
      endISO,
    } = body

    if (!clientName || !startISO || !endISO) {
      return NextResponse.json({ error: 'Missing clientName/startISO/endISO' }, { status: 400 })
    }

    const auth = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    const description = [
      `Service: ${serviceLabel}`,
      price ? `Price: £${price}` : '',
      scopeNotes ? `Scope: ${scopeNotes}` : '',
      'Status: quote pending',
    ].filter(Boolean).join('\n')

    const result = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${emoji} ${clientName} - ${serviceLabel}`,
        location: address || undefined,
        description,
        start: { dateTime: startISO, timeZone: 'Europe/London' },
        end: { dateTime: endISO, timeZone: 'Europe/London' },
        status: 'tentative',
        colorId: '5', // Banana - tentative quote
      },
    })

    return NextResponse.json({
      ok: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
    })
  } catch (error) {
    console.error('Calendar create error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
