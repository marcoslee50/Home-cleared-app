import { NextRequest, NextResponse } from 'next/server'
import { processJobUpdate, JobUpdate, DayPlan } from '@/lib/claude'
import { updateCalendarEvent } from '@/lib/calendar'
import { logDuration, formatDurationLogLine } from '@/lib/duration-log'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { update, currentPlan, currentTime } = body as {
      update: JobUpdate
      currentPlan: DayPlan
      currentTime: string
    }

    if (!update || !currentPlan) {
      return NextResponse.json({ error: 'Missing update or plan' }, { status: 400 })
    }

    const result = await processJobUpdate(update, currentPlan, currentTime)

    const job = currentPlan.jobs.find(j => j.id === update.jobId)
    if (job && update.finishedAt) {
      const actualDuration = update.actualDuration ||
        (update.arrivedAt && update.finishedAt
          ? calcMinutesDiff(update.arrivedAt, update.finishedAt)
          : null)

      const descriptionLines: string[] = []

      if (update.arrivedAt) {
        descriptionLines.push(
          `ACTUAL: arrived ${update.arrivedAt}${update.finishedAt ? `, finished ${update.finishedAt}` : ''}`
        )
      }

      if (actualDuration) {
        descriptionLines.push(`   -> ${actualDuration} min actual`)
      }

      if (update.photosTaken !== undefined) {
        descriptionLines.push(`Photos taken: ${update.photosTaken ? 'yes' : 'no'}`)
      }

      if (update.notes) {
        descriptionLines.push(`Notes: ${update.notes}`)
      }

      if (actualDuration) {
        const today = new Date().toISOString().split('T')[0]
        const operative =
          job.operative === 'both' ? 'Both' :
          job.operative === 'barry' ? 'Barry' : 'Marcos'
        descriptionLines.push(
          formatDurationLogLine(today, operative as 'Marcos' | 'Barry' | 'Both', job.jobType, actualDuration)
        )

        await logDuration(job.clientName, {
          date: today,
          operatives: operative,
          jobType: job.jobType,
          actualMins: actualDuration,
        })
      }

      await updateCalendarEvent({
        calendarId: job.id.includes('@') ? job.id : 'primary',
        eventId: update.jobId,
        title: `${job.emoji} ${job.clientName}`,
        descriptionAppend: descriptionLines.join('\n'),
        colorId: update.finishedAt ? '10' : '2',
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function calcMinutesDiff(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}
