// Four seasonal campaigns. The trigger month/day is fixed; the body is
// editable in Settings and stored in KV under settings:campaigns.
//
// Messages are NEVER sent automatically - the Settings page surfaces
// the active campaign with Copy / Open WhatsApp / Skip controls when
// today's date is at-or-after the trigger and within the active window.

export type CampaignId = 'spring-tidy' | 'summer-hedges' | 'autumn-clearance' | 'winter-check'

export interface Campaign {
  id: CampaignId
  label: string
  triggerMonth: number   // 1-12
  triggerDay: number
  audience: 'all' | 'landlords'
  body: string           // pre-written WhatsApp message
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'spring-tidy',
    label: 'Spring tidy',
    triggerMonth: 3,
    triggerDay: 1,
    audience: 'all',
    body: `Hi {{firstName}}, spring is here and Wirral gardens need some attention after winter! We have slots available this month for spring tidies and lawn prep.
Want to book in? - Marcos
wirralgardenandproperty.com`,
  },
  {
    id: 'summer-hedges',
    label: 'Summer hedges',
    triggerMonth: 6,
    triggerDay: 1,
    audience: 'all',
    body: `Hi {{firstName}}, hedge cutting season is here and slots are filling fast. Prices from £45 - want to get yours booked? - Marcos`,
  },
  {
    id: 'autumn-clearance',
    label: 'Autumn clearance',
    triggerMonth: 9,
    triggerDay: 1,
    audience: 'all',
    body: `Hi {{firstName}}, autumn is the best time to clear out and prep the garden for winter. One-off clearance visits available now - want to book? - Marcos`,
  },
  {
    id: 'winter-check',
    label: 'Winter property checks',
    triggerMonth: 11,
    triggerDay: 1,
    audience: 'landlords',
    body: `Hi {{firstName}}, just a thought - winter is when property issues show up. We do gutter checks, fence repairs, and exterior work before the worst weather. Worth a visit? - Marcos`,
  },
]

const ACTIVE_WINDOW_DAYS = 30

export interface CampaignStatus {
  campaign: Campaign
  active: boolean        // today >= trigger AND within window
  triggerDate: string    // YYYY-MM-DD this year
  daysIntoWindow: number
  daysRemaining: number
}

export function evaluateCampaigns(campaigns: Campaign[], now: Date = new Date()): CampaignStatus[] {
  const year = now.getFullYear()
  return campaigns.map(c => {
    const trigger = new Date(year, c.triggerMonth - 1, c.triggerDay)
    const triggerDate = trigger.toISOString().split('T')[0]
    const diffDays = Math.floor((now.getTime() - trigger.getTime()) / (1000 * 60 * 60 * 24))
    const active = diffDays >= 0 && diffDays < ACTIVE_WINDOW_DAYS
    return {
      campaign: c,
      active,
      triggerDate,
      daysIntoWindow: diffDays,
      daysRemaining: active ? ACTIVE_WINDOW_DAYS - diffDays : 0,
    }
  })
}

export function fillCampaignBody(body: string, vars: { firstName?: string }): string {
  return body.replace(/\{\{firstName\}\}/g, vars.firstName || 'there')
}

export { ACTIVE_WINDOW_DAYS }
