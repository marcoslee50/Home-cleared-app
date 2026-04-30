import { NextRequest, NextResponse } from 'next/server'
import { getTodaysJobs } from '@/lib/calendar'
import { buildDayPlan, PlanningContext } from '@/lib/claude'
import { getAllClientDurations } from '@/lib/duration-log'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      date,
      startTime = '09:30',
      barryWorking = false,
      barryDropoff = '15:00',
      barryStartTime,
      startLocation = 'New Brighton',
      specialTools = '',
    } = body

    const jobs = await getTodaysJobs(date)

    if (!jobs.length) {
      return NextResponse.json({
        message: 'No jobs found on the calendar for this date.',
        jobs: [],
        plan: null,
      })
    }

    const durationData = await getAllClientDurations()

    const enrichedJobs = jobs.map(job => {
      const storedDuration = durationData[job.title]
      return {
        ...job,
        storedDurationEstimate: storedDuration || null,
      }
    })

    const ctx: PlanningContext = {
      jobs: enrichedJobs,
      startTime,
      barryWorking,
      barryDropoff: barryWorking ? barryDropoff : undefined,
      barryStartTime: barryWorking ? (barryStartTime || startTime) : undefined,
      startLocation,
      specialTools,
      date: date || new Date().toISOString().split('T')[0],
    }

    const plan = await buildDayPlan(ctx)

    return NextResponse.json({ plan, jobCount: jobs.length })
  } catch (error) {
    console.error('Plan API error:', error)
    return NextResponse.json(
      { error: 'Failed to build day plan', detail: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || undefined
    const jobs = await getTodaysJobs(date)
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Calendar fetch error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
