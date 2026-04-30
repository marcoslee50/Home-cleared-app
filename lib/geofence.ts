// GPS Geofencing - detects when Marcos arrives at a job site
// Uses browser Geolocation API + Haversine distance calculation
// Triggers arrival notification at ~150m from job address

export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeofenceJob {
  id: string
  clientName: string
  address: string
  coords: GeoPoint
  radius: number // metres - default 150
}

export interface ArrivalEvent {
  jobId: string
  clientName: string
  arrivedAt: string // HH:MM
  coords: GeoPoint
}

// -- Haversine distance (metres) ----------------------------------------------

export function distanceMetres(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const c =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// -- Geocode an address via Google Maps ---------------------------------------

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null

  try {
    const encoded = encodeURIComponent(address + ' Wirral UK')
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}`
    )
    const data = await res.json()
    if (data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location
      return { lat, lng }
    }
  } catch (err) {
    console.error('Geocode failed:', address, err)
  }
  return null
}

// -- GeofenceWatcher class - runs in browser ----------------------------------

export class GeofenceWatcher {
  private jobs: GeofenceJob[] = []
  private watchId: number | null = null
  private notified = new Set<string>()
  private onArrival: (event: ArrivalEvent) => void
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor(onArrival: (event: ArrivalEvent) => void) {
    this.onArrival = onArrival
  }

  setJobs(jobs: GeofenceJob[]) {
    this.jobs = jobs
  }

  start() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported')
      return
    }

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.checkProximity({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('GPS error:', err.message),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    )

    this.checkInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => this.checkProximity({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      )
    }, 30000)
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  resetJob(jobId: string) {
    this.notified.delete(jobId)
  }

  private checkProximity(current: GeoPoint) {
    for (const job of this.jobs) {
      if (this.notified.has(job.id)) continue

      const dist = distanceMetres(current, job.coords)
      if (dist <= job.radius) {
        this.notified.add(job.id)
        const now = new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
        })
        this.onArrival({
          jobId: job.id,
          clientName: job.clientName,
          arrivedAt: now,
          coords: current,
        })
      }
    }
  }
}

// -- Request notification permission ------------------------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// -- Fire a local arrival notification ----------------------------------------

export function fireArrivalNotification(clientName: string) {
  if (Notification.permission !== 'granted') return
  new Notification(`Arrived at ${clientName}`, {
    body: 'Tap to log start time and take before photos',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `arrival-${clientName}`,
    requireInteraction: true,
  })
}

export function fireDepartureReminder(clientName: string) {
  if (Notification.permission !== 'granted') return
  new Notification(`Leaving ${clientName}?`, {
    body: 'Log finish time, take after photos, and post to Facebook',
    icon: '/icons/icon-192.png',
    tag: `departure-${clientName}`,
    requireInteraction: true,
  })
}
