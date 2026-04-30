// Upsell capture - "Spotted something?" during a job.
// Persists a note to the client profile AND fires an n8n webhook so a
// Kommo follow-up task gets created.
// n8n is the only outbound integration with Kommo - we never call
// Kommo's API directly from this app.

export type UpsellService =
  | 'fence-repair'
  | 'gutter-clean'
  | 'painting'
  | 'hedge-cutting'
  | 'garden-clearance'
  | 'jet-wash'
  | 'tree-work'
  | 'other'

export const UPSELL_SERVICES: { id: UpsellService; label: string }[] = [
  { id: 'fence-repair', label: 'Fence repair' },
  { id: 'gutter-clean', label: 'Gutter clean' },
  { id: 'painting', label: 'Painting' },
  { id: 'hedge-cutting', label: 'Hedge cutting' },
  { id: 'garden-clearance', label: 'Garden clearance' },
  { id: 'jet-wash', label: 'Jet wash' },
  { id: 'tree-work', label: 'Tree work' },
  { id: 'other', label: 'Other' },
]

export interface UpsellNote {
  spotted: string         // free text - what Marcos noticed
  service: UpsellService
  estimatedPrice?: number
  spottedAt: string       // ISO
  spottedBy: 'Marcos' | 'Barry' | 'Both'
  jobId?: string          // calendar event id of the job in progress
}

export interface KommoUpsellPayload {
  clientName: string
  address: string
  clientPhone?: string
  spotted: string
  service: UpsellService
  serviceLabel: string
  estimatedPrice?: number
  spottedAt: string
  jobId?: string
}

// Best-effort post to n8n. Returns true if the webhook accepted.
// If N8N_KOMMO_WEBHOOK_URL isn't configured, returns false silently -
// the upsell still saves to the client profile, the Kommo task just
// doesn't get created and the UI shows a "saved locally" badge.
export async function fireKommoWebhook(payload: KommoUpsellPayload): Promise<boolean> {
  const url = process.env.N8N_KOMMO_WEBHOOK_URL
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.error('n8n webhook failed:', err)
    return false
  }
}
