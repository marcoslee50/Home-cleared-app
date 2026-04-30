// WGP service pricing reference - hardcoded for Quote Builder.
// Source: handoff doc "WGP pricing reference" + Addendum 2 confirmation.

export interface ServicePrice {
  id: string
  label: string
  price?: number       // fixed price
  priceFrom?: number   // starting-from price (variable scope)
  unit: string         // 'visit' | 'month' | 'job'
  defaultEmoji: string // calendar emoji prefix
}

export const WGP_PRICING: Record<string, ServicePrice> = {
  basicTidy: {
    id: 'basicTidy',
    label: 'Basic Tidy',
    price: 35,
    unit: 'visit',
    defaultEmoji: '🌿',
  },
  fullMaintenance: {
    id: 'fullMaintenance',
    label: 'Full Maintenance',
    price: 65,
    unit: 'visit',
    defaultEmoji: '🌿',
  },
  fortnightlyPlan: {
    id: 'fortnightlyPlan',
    label: 'Fortnightly Plan',
    price: 120,
    unit: 'month',
    defaultEmoji: '🌿',
  },
  monthlyContract: {
    id: 'monthlyContract',
    label: 'Monthly Contract',
    price: 199,
    unit: 'month',
    defaultEmoji: '🌿',
  },
  hedgeCutting: {
    id: 'hedgeCutting',
    label: 'Hedge Cutting',
    priceFrom: 45,
    unit: 'job',
    defaultEmoji: '✂️',
  },
  turfing: {
    id: 'turfing',
    label: 'Turfing',
    priceFrom: 80,
    unit: 'job',
    defaultEmoji: '🌱',
  },
  clearance: {
    id: 'clearance',
    label: 'Garden Clearance',
    priceFrom: 80,
    unit: 'job',
    defaultEmoji: '🍂',
  },
  cemeteryPlot: {
    id: 'cemeteryPlot',
    label: 'Cemetery Plot Care',
    priceFrom: 28,
    unit: 'visit',
    defaultEmoji: '🌿',
  },
}

export function formatServicePrice(s: ServicePrice): string {
  if (s.price !== undefined) return `£${s.price} per ${s.unit}`
  if (s.priceFrom !== undefined) return `from £${s.priceFrom} per ${s.unit}`
  return 'POA'
}

export function buildQuoteWhatsAppMessage(params: {
  clientName: string
  serviceLabel: string
  price: number
  unit: string
  scopeNotes: string
  proposedDate: string
}): string {
  const firstName = params.clientName.split(' ')[0]
  return `Hi ${firstName},

Thanks for getting in touch with Wirral Garden & Property!

Here's your quote for ${params.serviceLabel}:

Price: £${params.price} per ${params.unit}
Scope: ${params.scopeNotes || 'as discussed'}
We can start: ${params.proposedDate}

To book, reply 'Yes' to this message or call 07542 888 772.

Marcos
wirralgardenandproperty.com`
}

export function buildQuoteLink(params: Parameters<typeof buildQuoteWhatsAppMessage>[0] & { clientPhone?: string }): string {
  const message = buildQuoteWhatsAppMessage(params)
  const phone = params.clientPhone?.replace(/[^0-9+]/g, '')
  const formattedPhone = phone?.startsWith('0')
    ? '44' + phone.slice(1)
    : phone?.startsWith('+')
      ? phone.slice(1)
      : phone
  const encoded = encodeURIComponent(message)
  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
