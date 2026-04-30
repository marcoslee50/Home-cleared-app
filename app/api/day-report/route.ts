import { NextRequest, NextResponse } from 'next/server'
import { generateDayReport, CompletedJobSummary } from '@/lib/day-report'
import { getOutstandingInvoices, getInvoicesByDate } from '@/lib/invoices'
import { DayPlan } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plan, completedJobs } = body as {
      plan: DayPlan
      completedJobs: CompletedJobSummary[]
    }

    if (!plan || !completedJobs) {
      return NextResponse.json({ error: 'Missing plan or completedJobs' }, { status: 400 })
    }

    const outstanding = await getOutstandingInvoices()

    const todayInvoices = await getInvoicesByDate(new Date().toISOString().split('T')[0])
    const invoicedClients = new Set(todayInvoices.map(i => i.clientName))
    const invoicesToSend = completedJobs
      .map(j => j.job.clientName)
      .filter(name => !invoicedClients.has(name))

    const report = await generateDayReport({
      plan,
      completedJobs,
      overdueInvoices: outstanding.filter(i => i.status === 'overdue'),
      invoicesToSend,
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Day report error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
