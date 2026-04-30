import { NextRequest, NextResponse } from 'next/server'
import {
  createInvoice,
  getInvoice,
  getInvoicesByDate,
  getOutstandingInvoices,
  markInvoiceSent,
  markInvoicePaid,
  buildWhatsAppLink,
  buildReminderMessage,
  daysSinceDue,
} from '@/lib/invoices'
import { put } from '@vercel/blob'

// ── GET — list invoices ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const outstanding = searchParams.get('outstanding')
  const id = searchParams.get('id')

  if (id) {
    const invoice = await getInvoice(id)
    return invoice
      ? NextResponse.json(invoice)
      : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (outstanding === 'true') {
    const invoices = await getOutstandingInvoices()
    return NextResponse.json({ invoices })
  }

  if (date) {
    const invoices = await getInvoicesByDate(date)
    return NextResponse.json({ invoices })
  }

  return NextResponse.json({ error: 'Provide date, id, or outstanding=true' }, { status: 400 })
}

// ── POST — create / mutate invoices ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const invoice = await createInvoice(body)
      return NextResponse.json(invoice)
    }

    if (action === 'mark-sent') {
      const { invoiceId, pdfUrl } = body
      const invoice = await getInvoice(invoiceId)
      if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const whatsappLink = buildWhatsAppLink(invoice, pdfUrl)
      await markInvoiceSent(invoiceId, whatsappLink)

      return NextResponse.json({ whatsappLink })
    }

    if (action === 'mark-paid') {
      await markInvoicePaid(body.invoiceId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'reminder') {
      const { invoiceId, pdfUrl } = body
      const invoice = await getInvoice(invoiceId)
      if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const days = daysSinceDue(invoice)
      const message = buildReminderMessage(invoice, pdfUrl, days)
      const whatsappLink = days >= 14 ? null : `https://wa.me/?text=${encodeURIComponent(message)}`

      return NextResponse.json({ message, whatsappLink, requiresCall: days >= 14 })
    }

    if (action === 'generate-pdf') {
      const { invoiceId, pdfBase64 } = body
      const invoice = await getInvoice(invoiceId)
      if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      const blob = await put(`invoices/${invoiceId}.pdf`, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      })

      return NextResponse.json({ pdfUrl: blob.url })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Invoice API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
