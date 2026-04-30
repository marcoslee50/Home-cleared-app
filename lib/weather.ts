// Met Office DataPoint forecast for Wirral (Bidston Hill, station 3414).
// Free tier: 5000 calls/day, 100/min.
//
// Response shape (3-hourly forecast):
//   SiteRep.DV.Location.Period[].Rep[] - each Rep has:
//     $   = minutes after midnight (0, 180, 360, 540, 720, 900, 1080, 1260)
//     T   = temperature C
//     S   = wind speed mph
//     G   = gust mph
//     Pp  = precipitation probability %
//     W   = weather type code (0-30)
//     H   = humidity %
//     V   = visibility code
//
// Weather type codes used here for "cloud cover" approximation:
//   0-1  clear / sunny           -> low cover
//   2-3  partly cloudy           -> medium cover
//   5-6  mist / fog              -> high cover
//   7-8  cloudy / overcast       -> high cover
//   9+   rain / sleet / snow     -> very high cover

const WIRRAL_STATION_ID = '3414' // Bidston Hill

export interface WeatherSlot {
  hour: number          // 0..21 (3-hour increments)
  tempC: number
  windMph: number
  gustMph: number
  precipPct: number
  cloudPct: number      // 0-100, derived from weather code
  weatherCode: number
}

export interface WeatherDay {
  date: string          // YYYY-MM-DD
  slots: WeatherSlot[]
  // Headline numbers for the working-day window 09:00..17:00
  daytime: {
    avgTempC: number
    maxWindMph: number
    maxGustMph: number
    maxPrecipPct: number
    avgCloudPct: number
  }
}

export interface WeatherFlags {
  noSpray: boolean      // wind > 15 mph
  noTurf: boolean       // precip > 40%
  delayedStart: boolean // precip > 70% during morning slot
  poorPhotoLight: boolean // cloud cover > 85%
  noChainsaw: boolean   // wind > 25 mph
  summary: string       // one-line plain English headline
  goodConditions: boolean
}

const WEATHER_THRESHOLDS = {
  noSprayWindMph: 15,
  noTurfPrecipPct: 40,
  delayedStartPrecipPct: 70,
  poorPhotoCloudPct: 85,
  chainsawWindMph: 25,
}

function codeToCloudPct(code: number): number {
  if (code <= 1) return 10
  if (code <= 3) return 40
  if (code <= 4) return 50
  if (code <= 6) return 80   // mist/fog
  if (code === 7) return 75
  if (code === 8) return 95
  return 90                    // anything raining/snowing
}

function num(x: unknown): number {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

export async function fetchWirralForecast(date?: string): Promise<WeatherDay | null> {
  const key = process.env.METOFFICE_API_KEY
  if (!key) return null

  const target = date || new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/${WIRRAL_STATION_ID}?res=3hourly&key=${encodeURIComponent(key)}`,
      { next: { revalidate: 60 * 30 } } // 30-minute cache
    )
    if (!res.ok) return null
    const data = await res.json() as {
      SiteRep?: { DV?: { Location?: { Period?: Array<{ value: string; Rep: Array<Record<string, string>> }> } } }
    }
    const periods = data.SiteRep?.DV?.Location?.Period
    if (!periods?.length) return null

    // Find the period for the target date
    const period = periods.find(p => p.value.startsWith(target))
    if (!period) return null

    const slots: WeatherSlot[] = period.Rep.map(r => {
      const minutes = num(r['$'])
      const code = num(r.W)
      return {
        hour: Math.floor(minutes / 60),
        tempC: num(r.T),
        windMph: num(r.S),
        gustMph: num(r.G),
        precipPct: num(r.Pp),
        cloudPct: codeToCloudPct(code),
        weatherCode: code,
      }
    })

    // Working-day window 09:00..18:00
    const day = slots.filter(s => s.hour >= 9 && s.hour <= 18)
    const window = day.length ? day : slots

    const avgTempC = round1(avg(window.map(s => s.tempC)))
    const maxWindMph = Math.round(Math.max(...window.map(s => s.windMph)))
    const maxGustMph = Math.round(Math.max(...window.map(s => s.gustMph)))
    const maxPrecipPct = Math.round(Math.max(...window.map(s => s.precipPct)))
    const avgCloudPct = Math.round(avg(window.map(s => s.cloudPct)))

    return {
      date: target,
      slots,
      daytime: { avgTempC, maxWindMph, maxGustMph, maxPrecipPct, avgCloudPct },
    }
  } catch (err) {
    console.error('Met Office fetch failed:', err)
    return null
  }
}

export function evaluateFlags(day: WeatherDay): WeatherFlags {
  const { maxWindMph, maxPrecipPct, avgCloudPct, avgTempC } = day.daytime

  // Morning-window precip for delayed-start check
  const morningPrecip = Math.round(Math.max(
    0,
    ...day.slots.filter(s => s.hour >= 6 && s.hour <= 12).map(s => s.precipPct)
  ))

  const noSpray = maxWindMph > WEATHER_THRESHOLDS.noSprayWindMph
  const noTurf = maxPrecipPct > WEATHER_THRESHOLDS.noTurfPrecipPct
  const delayedStart = morningPrecip > WEATHER_THRESHOLDS.delayedStartPrecipPct
  const poorPhotoLight = avgCloudPct > WEATHER_THRESHOLDS.poorPhotoCloudPct
  const noChainsaw = maxWindMph > WEATHER_THRESHOLDS.chainsawWindMph

  const goodConditions = !noSpray && !noTurf && !delayedStart && !noChainsaw

  const summary = `${avgTempC}C - Wind ${maxWindMph}mph - Rain ${maxPrecipPct}% - ${
    goodConditions ? 'Good conditions' :
    noChainsaw ? 'High winds: no tree work' :
    delayedStart ? 'Heavy rain expected: late start likely' :
    noTurf ? 'Wet: avoid turfing' :
    noSpray ? 'Windy: no spraying' :
    'Mixed conditions'
  }`

  return { noSpray, noTurf, delayedStart, poorPhotoLight, noChainsaw, summary, goodConditions }
}

// Map a job's type to the weather flags that should appear on its card
export function relevantFlagsForJob(jobType: string, flags: WeatherFlags): string[] {
  const t = jobType.toLowerCase()
  const out: string[] = []
  if (flags.noSpray && (t.includes('spray') || t.includes('weed'))) out.push('No spray (windy)')
  if (flags.noTurf && t.includes('turf')) out.push('Turf at risk (rain)')
  if (flags.noChainsaw && (t.includes('tree') || t.includes('chainsaw') || t.includes('hedge'))) {
    out.push('No tree/hedge work (high winds)')
  }
  if (flags.poorPhotoLight) out.push('Flat light - photos will look dull')
  if (flags.delayedStart) out.push('Late start possible')
  return out
}

function avg(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
function round1(n: number): number { return Math.round(n * 10) / 10 }
