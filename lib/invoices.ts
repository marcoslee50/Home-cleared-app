// Invoice system - PDF generation, WhatsApp delivery, payment tracking
// Bank transfer payment. Tracks: draft -> sent -> viewed -> paid -> overdue
//
// KV access is wrapped to fail gracefully when the @vercel/kv module
// isn't configured (local dev without KV credentials). Same pattern as
// lib/duration-log.ts: dynamic import inside try/catch.

type KVClient = {
  get: <T = unknown>(key: string) => Promise<T | null>
  set: (key: string, value: unknown) => Promise<unknown>
  incr: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<unknown>
  sadd: (key: string, ...members: string[]) => Promise<unknown>
  srem: (key: string, ...members: string[]) => Promise<unknown>
  smembers: (key: string) => Promise<string[]>
}

async function getKv(): Promise<KVClient | null> {
  try {
    const mod = await import('@vercel/kv')
    return mod.kv as unknown as KVClient
  } catch {
    return null
  }
}

// -- Types --------------------------------------------------------------------

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  jobId?: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  jobDate: string
  issueDate: string
  dueDate: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  status: InvoiceStatus
  notes?: string
  photoUrls?: string[]
  sentAt?: string
  paidAt?: string
  remindersSent: number
  lastReminderAt?: string
  blobUrl?: string
  whatsappLink?: string
  facebookPostId?: string
}

export interface DayInvoiceSummary {
  date: string
  invoices: Invoice[]
  totalRevenue: number
  outstandingRevenue: number
  paidRevenue: number
}

// -- Invoice number generator -------------------------------------------------

async function nextInvoiceNumber(date: string): Promise<string> {
  const key = `invoice_seq:${date.replace(/-/g, '')}`
  const kv = await getKv()
  if (!kv) {
    return `INV-${date.replace(/-/g, '')}-${Date.now().toString().slice(-3)}`
  }
  try {
    const seq = await kv.incr(key)
    await kv.expire(key, 60 * 60 * 24 * 365)
    return `INV-${date.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`
  } catch {
    return `INV-${date.replace(/-/g, '')}-${Date.now().toString().slice(-3)}`
  }
}

// -- Create invoice record ----------------------------------------------------

export async function createInvoice(params: {
  clientName: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  jobDate: string
  jobId?: string
  lineItems: InvoiceLineItem[]
  notes?: string
  photoUrls?: string[]
}): Promise<Invoice> {
  const today = new Date().toISOString().split('T')[0]
  const due = new Date()
  due.setDate(due.getDate() + 14)
  const dueDate = due.toISOString().split('T')[0]

  const subtotal = params.lineItems.reduce((sum, item) => sum + item.total, 0)
  const vatRate = process.env.INVOICE_VAT_NUMBER ? 0.20 : 0
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100
  const total = subtotal + vatAmount

  const id = await nextInvoiceNumber(today)

  const invoice: Invoice = {
    id,
    jobId: params.jobId,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone,
    clientAddress: params.clientAddress,
    jobDate: params.jobDate,
    issueDate: today,
    dueDate,
    lineItems: params.lineItems,
    subtotal,
    vatRate,
    vatAmount,
    total,
    status: 'draft',
    notes: params.notes,
    photoUrls: params.photoUrls,
    remindersSent: 0,
  }

  await saveInvoice(invoice)
  return invoice
}

// -- KV persistence -----------------------------------------------------------

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const kv = await getKv()
  if (!kv) return
  try {
    await kv.set(`invoice:${invoice.id}`, JSON.stringify(invoice))
    await kv.sadd(`invoices:${invoice.issueDate}`, invoice.id)
    await kv.sadd(`invoices:status:${invoice.status}`, invoice.id)
  } catch (err) {
    console.error('Failed to save invoice:', err)
  }
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const kv = await getKv()
  if (!kv) return null
  try {
    const data = await kv.get<string>(`invoice:${id}`)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function getInvoicesByDate(date: string): Promise<Invoice[]> {
  const kv = await getKv()
  if (!kv) return []
  try {
    const ids = (await kv.smembers(`invoices:${date}`)) as string[]
    const invoices = await Promise.all(ids.map(id => getInvoice(id)))
    return invoices.filter(Boolean) as Invoice[]
  } catch {
    return []
  }
}

export async function getOutstandingInvoices(): Promise<Invoice[]> {
  const kv = await getKv()
  if (!kv) return []
  try {
    const sentIds = (await kv.smembers('invoices:status:sent')) as string[]
    const invoices = await Promise.all(sentIds.map(id => getInvoice(id)))
    const valid = invoices.filter(Boolean) as Invoice[]

    const today = new Date()
    return valid.map(inv => {
      if (inv.status === 'sent' && new Date(inv.dueDate) < today) {
        return { ...inv, status: 'overdue' as InvoiceStatus }
      }
      return inv
    })
  } catch {
    return []
  }
}

// -- WhatsApp link builder ----------------------------------------------------

export function buildWhatsAppLink(invoice: Invoice, pdfUrl: string): string {
  const phone = (invoice.clientPhone || '').replace(/[^0-9+]/g, '')
  const formattedPhone = phone.startsWith('0')
    ? '44' + phone.slice(1)
    : phone.startsWith('+')
      ? phone.slice(1)
      : phone

  const message = buildWhatsAppMessage(invoice, pdfUrl)
  const encoded = encodeURIComponent(message)

  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encoded}`
  }
  return `https://wa.me/?text=${encoded}`
}

function buildWhatsAppMessage(invoice: Invoice, pdfUrl: string): string {
  const company = process.env.INVOICE_COMPANY_NAME || 'Wirral Garden & Property'
  const phone = process.env.INVOICE_PHONE || '07542 888 772'

  return `Hi ${invoice.clientName.split(' ')[0]},

Thank you for having us - here's your invoice for the work carried out on ${formatDate(invoice.jobDate)}.

Invoice: ${invoice.id}
Amount: £${invoice.total.toFixed(2)}
Due: ${formatDate(invoice.dueDate)}

View/download: ${pdfUrl}

Payment by bank transfer:
Bank: ${process.env.INVOICE_BANK_NAME || ''}
Sort code: ${process.env.INVOICE_SORT_CODE || ''}
Account: ${process.env.INVOICE_ACCOUNT_NUMBER || ''}
Reference: ${invoice.id}

Any questions, just reply here or call ${phone}.

Thanks,
Marcos - ${company}`
}

// -- Reminder messages --------------------------------------------------------

export function buildReminderMessage(invoice: Invoice, pdfUrl: string, daysPast: number): string {
  const firstName = invoice.clientName.split(' ')[0]
  const company = process.env.INVOICE_COMPANY_NAME || 'Wirral Garden & Property'

  if (daysPast <= 7) {
    return `Hi ${firstName}, just a friendly reminder that invoice ${invoice.id} for £${invoice.total.toFixed(2)} is due ${formatDate(invoice.dueDate)}. View here: ${pdfUrl} - Marcos, ${company}`
  }

  if (daysPast <= 14) {
    return `Hi ${firstName}, invoice ${invoice.id} for £${invoice.total.toFixed(2)} was due on ${formatDate(invoice.dueDate)} and is now overdue. Please arrange payment when you get a chance. Bank details are on the invoice: ${pdfUrl} - Marcos, ${company}`
  }

  return `CALL REQUIRED: ${invoice.clientName} - ${invoice.id} - £${invoice.total.toFixed(2)} - ${daysPast} days overdue`
}

export function daysSinceDue(invoice: Invoice): number {
  const due = new Date(invoice.dueDate)
  const today = new Date()
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

// -- Update invoice status ----------------------------------------------------

export async function markInvoiceSent(invoiceId: string, whatsappLink: string): Promise<void> {
  const inv = await getInvoice(invoiceId)
  if (!inv) return
  const updated: Invoice = {
    ...inv,
    status: 'sent',
    sentAt: new Date().toISOString(),
    whatsappLink,
  }
  const kv = await getKv()
  if (kv) {
    try {
      await kv.srem(`invoices:status:${inv.status}`, invoiceId)
      await kv.sadd('invoices:status:sent', invoiceId)
    } catch {}
  }
  await saveInvoice(updated)
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const inv = await getInvoice(invoiceId)
  if (!inv) return
  const updated: Invoice = {
    ...inv,
    status: 'paid',
    paidAt: new Date().toISOString(),
  }
  const kv = await getKv()
  if (kv) {
    try {
      await kv.srem(`invoices:status:${inv.status}`, invoiceId)
      await kv.sadd('invoices:status:paid', invoiceId)
    } catch {}
  }
  await saveInvoice(updated)
}

// -- Helpers ------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export { formatDate }
