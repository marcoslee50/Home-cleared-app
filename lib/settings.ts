// In-app settings persisted to Vercel KV. Falls back to defaults when
// KV isn't configured (read returns defaults, writes are no-op).

export interface FacebookTemplates {
  'after-short': string
  'before-after': string
  seasonal: string
}

export interface BarrySettings {
  defaultPickupTime: string  // 'HH:MM'
  defaultDropoffTime: string
  phone: string              // for the briefing WhatsApp share
}

export interface InvoiceSettings {
  bankName: string
  sortCode: string
  accountNumber: string
  paymentTerms: number       // days
  prefix: string             // INV
}

export interface BarryDebtNote {
  text: string               // private note, never displayed elsewhere
  updatedAt: string
}

export interface AppSettings {
  fbTemplates?: FacebookTemplates
  barry?: BarrySettings
  invoice?: InvoiceSettings
  reviewLink?: string        // overrides NEXT_PUBLIC_GOOGLE_REVIEW_LINK
  barryDebtNote?: BarryDebtNote
}

const DEFAULT_FB_TEMPLATES: FacebookTemplates = {
  'after-short': `{{emoji}} Job done in {{area}}!

{{jobType}} completed today. {{outcome}}

{{phone}}
{{website}}

#WirralGarden #{{area}} #GardenMaintenance #Wirral`,

  'before-after': `{{emoji}} Transformation Tuesday - {{area}}

Before & after: {{jobType}} today.
{{outcome}}

If your garden needs attention, give us a call.
{{phone}} | {{website}}

#WirralGarden #Wirral #GardenTransformation #{{area}}`,

  seasonal: `{{emoji}} Spring is here - and so are we!

{{jobType}} in {{area}} - another satisfied customer.
{{outcome}}

{{phone}}
{{website}}

#WirralGarden #SpringGarden #Wirral #{{area}}`,
}

const DEFAULT_BARRY: BarrySettings = {
  defaultPickupTime: '09:30',
  defaultDropoffTime: '15:00',
  phone: '',
}

const DEFAULT_INVOICE: InvoiceSettings = {
  bankName: '',
  sortCode: '',
  accountNumber: '',
  paymentTerms: 14,
  prefix: 'INV',
}

const DEFAULT_BARRY_DEBT_NOTE: BarryDebtNote = {
  text: 'Informal debt approx £160. Repaying at £20/day off day rate.\nRemaining balance: <edit me>',
  updatedAt: '',
}

// Guard against @vercel/kv's synchronous env-var validation by checking
// before any method call. The KV proxy throws synchronously on first
// invocation if KV_REST_API_URL / KV_REST_API_TOKEN are missing, which
// can escape try/catch blocks in some bundling scenarios.
function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function readKey<T>(key: string, fallback: T): Promise<T> {
  if (!kvConfigured()) return fallback
  try {
    const { kv } = await import('@vercel/kv')
    const data = await kv.get<string>(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

async function writeKey(key: string, value: unknown): Promise<void> {
  if (!kvConfigured()) return
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Failed to save ${key}:`, err)
  }
}

export async function loadSettings(): Promise<Required<AppSettings>> {
  const [fbTemplates, barry, invoice, reviewLink, barryDebtNote] = await Promise.all([
    readKey('settings:fb_templates', DEFAULT_FB_TEMPLATES),
    readKey('settings:barry', DEFAULT_BARRY),
    readKey('settings:invoice', DEFAULT_INVOICE),
    readKey('settings:review_link', ''),
    readKey('settings:barry_debt', DEFAULT_BARRY_DEBT_NOTE),
  ])
  return { fbTemplates, barry, invoice, reviewLink, barryDebtNote }
}

export async function saveFbTemplates(t: FacebookTemplates) { await writeKey('settings:fb_templates', t) }
export async function saveBarry(b: BarrySettings) { await writeKey('settings:barry', b) }
export async function saveInvoice(i: InvoiceSettings) { await writeKey('settings:invoice', i) }
export async function saveReviewLink(link: string) { await writeKey('settings:review_link', link) }
export async function saveBarryDebtNote(n: BarryDebtNote) { await writeKey('settings:barry_debt', n) }

export {
  DEFAULT_FB_TEMPLATES,
  DEFAULT_BARRY,
  DEFAULT_INVOICE,
  DEFAULT_BARRY_DEBT_NOTE,
}
