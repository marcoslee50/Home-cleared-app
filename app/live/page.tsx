'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { DayPlan, ScheduledJob } from '@/lib/claude'
import { buildReviewRequestLink } from '@/lib/review-request'
import { buildOnMyWayMessage, buildOnMyWayLink, estimateEtaMinutes, roundEta } from '@/lib/on-my-way'
import { UPSELL_SERVICES, UpsellService } from '@/lib/upsell'

type JobStatus = 'pending' | 'in-progress' | 'departing' | 'done'

interface JobPhoto { url: string; type: 'before' | 'after' }

interface JobState {
  job: ScheduledJob
  status: JobStatus
  arrivedAt?: string
  finishedAt?: string
  actualDuration?: number
  notes: string
  photosBefore: JobPhoto[]
  photosAfter: JobPhoto[]
  facebookPosted: boolean
  gpsTriggered: boolean
}

export default function LivePage() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [jobStates, setJobStates] = useState<JobState[]>([])
  const [currentTime, setCurrentTime] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [schedDiff, setSchedDiff] = useState<number | null>(null)
  const [arrivedBanner, setArrivedBanner] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<{ jobId: string; type: 'before' | 'after' } | null>(null)
  const geofenceWatcher = useRef<number | null>(null)
  const notified = useRef(new Set<string>())

  useEffect(() => {
    const stored = sessionStorage.getItem('wgp_plan')
    if (stored) {
      const p: DayPlan = JSON.parse(stored)
      setPlan(p)
      setJobStates(p.jobs.map(job => ({
        job, status: 'pending', notes: '',
        photosBefore: [], photosAfter: [],
        facebookPosted: false, gpsTriggered: false,
      })))
    }
    const tick = () => setCurrentTime(
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
    )
    tick()
    const t = setInterval(tick, 10000)
    return () => { clearInterval(t); stopGPS() }
  }, [])

  useEffect(() => {
    const done = jobStates.filter(j => j.status === 'done')
    if (!done.length) { setSchedDiff(null); return }
    const total = done.reduce((s, j) => s + ((j.actualDuration || 0) - j.job.estimatedDuration), 0)
    setSchedDiff(total)
  }, [jobStates])

  const getNow = () => new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })

  // -- GPS --------------------------------------------------------------------
  const startGPS = useCallback(async () => {
    if (!plan || !navigator.geolocation) return
    if (Notification.permission !== 'granted') await Notification.requestPermission()

    const coords: Record<string, { lat: number; lng: number }> = {}
    for (const job of plan.jobs) {
      if (!job.address) continue
      try {
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(job.address + ' Wirral UK')}&key=${key}`)
        const d = await r.json()
        if (d.results?.[0]) coords[job.id] = d.results[0].geometry.location
      } catch {}
    }

    const watchId = navigator.geolocation.watchPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      for (const job of plan.jobs) {
        if (notified.current.has(job.id) || !coords[job.id]) continue
        const c = coords[job.id]
        const R = 6371000
        const dLat = (c.lat - lat) * Math.PI / 180
        const dLng = (c.lng - lng) * Math.PI / 180
        const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(c.lat*Math.PI/180)*Math.sin(dLng/2)**2
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        if (dist <= 150) {
          notified.current.add(job.id)
          const now = getNow()
          if (Notification.permission === 'granted') {
            new Notification(`Arrived at ${job.clientName}`, {
              body: 'Tap to log start time and take before photos',
              requireInteraction: true,
            })
          }
          setArrivedBanner(job.clientName)
          setTimeout(() => setArrivedBanner(null), 6000)
          setJobStates(prev => prev.map(js =>
            js.job.id === job.id ? { ...js, status: 'in-progress', arrivedAt: now, gpsTriggered: true } : js
          ))
        }
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 })

    geofenceWatcher.current = watchId
    setGpsActive(true)
  }, [plan])

  const stopGPS = () => {
    if (geofenceWatcher.current !== null) {
      navigator.geolocation?.clearWatch(geofenceWatcher.current)
      geofenceWatcher.current = null
    }
    setGpsActive(false)
  }

  // -- Actions ----------------------------------------------------------------
  const markArrived = (jobId: string) => {
    setJobStates(prev => prev.map(js =>
      js.job.id === jobId ? { ...js, status: 'in-progress', arrivedAt: getNow() } : js
    ))
  }

  const openCamera = (jobId: string, type: 'before' | 'after') => {
    photoTarget.current = { jobId, type }
    fileInputRef.current?.click()
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = photoTarget.current
    if (!target || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const canvas = document.createElement('canvas')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, 1200 / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(async blob => {
        if (!blob) return
        const compressed = new File([blob], file.name, { type: 'image/jpeg' })
        const preview = URL.createObjectURL(compressed)
        setJobStates(prev => prev.map(js => {
          if (js.job.id !== target.jobId) return js
          const photo: JobPhoto = { url: preview, type: target.type }
          return target.type === 'before'
            ? { ...js, photosBefore: [...js.photosBefore, photo] }
            : { ...js, photosAfter: [...js.photosAfter, photo] }
        }))
        const today = new Date().toISOString().split('T')[0]
        const js = jobStates.find(j => j.job.id === target.jobId)
        if (js) {
          const fd = new FormData()
          fd.append('file', compressed)
          fd.append('pathname', `jobs/${today}/${js.job.clientName.toLowerCase().replace(/\s+/g, '-')}/${target.type}/${Date.now()}.jpg`)
          fd.append('clientName', js.job.clientName)
          fd.append('jobDate', today)
          fd.append('type', target.type)
          try {
            const r = await fetch('/api/photos/upload', { method: 'POST', body: fd })
            if (r.ok) {
              const uploaded = await r.json()
              setJobStates(prev => prev.map(js2 => {
                if (js2.job.id !== target.jobId) return js2
                const update = (photos: JobPhoto[]) => photos.map(p =>
                  p.url === preview ? { ...p, url: uploaded.url } : p
                )
                return target.type === 'before'
                  ? { ...js2, photosBefore: update(js2.photosBefore) }
                  : { ...js2, photosAfter: update(js2.photosAfter) }
              }))
            }
          } catch {}
        }
      }, 'image/jpeg', 0.82)
    }
    img.src = url
    e.target.value = ''
    photoTarget.current = null
  }

  const startDeparture = (jobId: string) => {
    const name = jobStates.find(j => j.job.id === jobId)?.job.clientName || ''
    if (Notification.permission === 'granted') {
      new Notification(`Leaving ${name}?`, { body: 'Take after photos and post to Facebook before you go' })
    }
    setJobStates(prev => prev.map(js =>
      js.job.id === jobId ? { ...js, status: 'departing' } : js
    ))
  }

  const completeJob = async (jobId: string) => {
    const now = getNow()
    const js = jobStates.find(j => j.job.id === jobId)
    if (!js || !plan) return

    const arrivedAt = js.arrivedAt || js.job.scheduledArrival
    const [ah, am] = arrivedAt.split(':').map(Number)
    const [fh, fm] = now.split(':').map(Number)
    const actual = (fh * 60 + fm) - (ah * 60 + am)

    setJobStates(prev => prev.map(j =>
      j.job.id === jobId ? { ...j, status: 'done', finishedAt: now, actualDuration: actual } : j
    ))
    setUpdating(jobId)

    const completedSummary = {
      job: js.job,
      arrivedAt,
      finishedAt: now,
      actualDuration: actual,
      estimatedDuration: js.job.estimatedDuration,
      photosBefore: js.photosBefore.length,
      photosAfter: js.photosAfter.length,
      facebookPosted: js.facebookPosted,
      afterPhotoUrl: js.photosAfter.find(p => p.url.startsWith('https://'))?.url,
    }
    const existing = JSON.parse(sessionStorage.getItem('wgp_completed_jobs') || '[]')
    existing.push(completedSummary)
    sessionStorage.setItem('wgp_completed_jobs', JSON.stringify(existing))

    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update: { jobId, clientName: js.job.clientName, arrivedAt, finishedAt: now, actualDuration: actual, notes: js.notes, photosTaken: js.photosAfter.length > 0 },
          currentPlan: plan,
          currentTime: now,
        }),
      })
      const result = await res.json()
      if (result.remainingJobs) {
        const updated = { ...plan, jobs: result.remainingJobs }
        setPlan(updated)
        sessionStorage.setItem('wgp_plan', JSON.stringify(updated))
      }
    } catch {}
    setUpdating(null)
  }

  const postToFacebook = async (jobId: string, templateId: string, outcome: string) => {
    const js = jobStates.find(j => j.job.id === jobId)
    if (!js) return
    try {
      await fetch('/api/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientArea: js.job.address?.split(',').slice(-2, -1)[0]?.trim() || 'Wirral',
          jobType: js.job.jobType,
          jobEmoji: js.job.emoji,
          outcome,
          photoUrls: js.photosAfter.filter(p => p.url.startsWith('https://')).map(p => p.url),
          templateId,
        }),
      })
      setJobStates(prev => prev.map(j => j.job.id === jobId ? { ...j, facebookPosted: true } : j))
    } catch (err) { console.error(err) }
  }

  const doneCount = jobStates.filter(j => j.status === 'done').length
  const totalCount = jobStates.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  if (!plan) {
    return (
      <div className="app-shell mesh-bg">
        <div className="page-content flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-5">L</div>
          <h2 className="font-display text-xl font-bold text-text-primary mb-3">No route planned</h2>
          <p className="text-text-muted text-sm mb-6">Plan today's route first.</p>
          <Link href="/plan" className="btn-primary">Plan Today</Link>
        </div>
        <BottomNav active="live" />
      </div>
    )
  }

  return (
    <div className="app-shell mesh-bg">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

      {arrivedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-fade-in"
          style={{ background: 'var(--brand-green)', color: 'white' }}>
          <span className="text-2xl">!</span>
          <div>
            <p className="font-semibold text-sm">GPS: Arrived at {arrivedBanner}</p>
            <p className="text-xs opacity-80">Time logged - Take before photos now</p>
          </div>
        </div>
      )}

      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text-primary">Live Day</h1>
          <span className="font-mono text-text-muted text-sm">{currentTime}</span>
        </div>

        {schedDiff !== null && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: Math.abs(schedDiff) <= 10 ? 'rgba(45,170,107,0.15)' : schedDiff > 0 ? 'rgba(212,160,23,0.15)' : 'rgba(46,109,180,0.15)',
              color: Math.abs(schedDiff) <= 10 ? 'var(--brand-green)' : schedDiff > 0 ? 'var(--status-warn)' : 'var(--brand-blue-light)',
            }}>
            {Math.abs(schedDiff) <= 10 ? 'On schedule' : schedDiff > 0 ? `${schedDiff}m behind` : `${Math.abs(schedDiff)}m ahead`}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gpsActive ? 'animate-pulse' : ''}`} style={{ background: gpsActive ? 'var(--brand-green)' : 'var(--surface-border)' }} />
            <span className="text-text-muted text-xs">GPS {gpsActive ? 'active - auto-detecting arrivals' : 'off'}</span>
          </div>
          {!gpsActive
            ? <button onClick={startGPS} className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:border-brand-green transition-colors">Enable</button>
            : <button onClick={stopGPS} className="text-xs px-2 py-1 rounded text-text-muted hover:text-status-alert transition-colors">Stop</button>
          }
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>{doneCount} of {totalCount} jobs done</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: 'var(--brand-green)' }} />
          </div>
        </div>
      </header>

      <div className="page-content space-y-3">
        {jobStates.map(js => (
          <LiveJobCard
            key={js.job.id}
            jobState={js}
            isUpdating={updating === js.job.id}
            onArrive={() => markArrived(js.job.id)}
            onPhoto={type => openCamera(js.job.id, type)}
            onStartDeparture={() => startDeparture(js.job.id)}
            onComplete={() => completeJob(js.job.id)}
            onNotesChange={n => setJobStates(prev => prev.map(j => j.job.id === js.job.id ? { ...j, notes: n } : j))}
            onFacebookPost={(tpl, outcome) => postToFacebook(js.job.id, tpl, outcome)}
          />
        ))}

        {doneCount === totalCount && totalCount > 0 && (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">!</div>
            <h3 className="font-display text-xl font-bold mb-2">Day complete!</h3>
            <p className="text-text-muted text-sm mb-4">{totalCount} jobs done.</p>
            <Link href="/day-report" className="btn-primary w-full py-3 block text-center text-sm">
              View Day Report & Send Invoices
            </Link>
          </div>
        )}
      </div>

      <BottomNav active="live" />
    </div>
  )
}

function LiveJobCard({ jobState, isUpdating, onArrive, onPhoto, onStartDeparture, onComplete, onNotesChange, onFacebookPost }: {
  jobState: JobState
  isUpdating: boolean
  onArrive: () => void
  onPhoto: (t: 'before'|'after') => void
  onStartDeparture: () => void
  onComplete: () => void
  onNotesChange: (n: string) => void
  onFacebookPost: (tpl: string, outcome: string) => void
}) {

  const { job, status, arrivedAt, finishedAt, actualDuration, photosBefore, photosAfter, facebookPosted } = jobState
  const [fbOutcome, setFbOutcome] = useState('')
  const [fbTemplate, setFbTemplate] = useState('after-short')
  const [showFbForm, setShowFbForm] = useState(false)
  const [profile, setProfile] = useState<{ accessNotes: string; dogOnSite: boolean; parkingNotes: string; visitCount: number } | null>(null)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [reviewLink, setReviewLink] = useState(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || '')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/clients?name=${encodeURIComponent(job.clientName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => { if (!cancelled && p) setProfile(p) })
      .catch(() => {})
    fetch('/api/invoice-config')
      .then(r => r.ok ? r.json() : null)
      .then(c => { if (!cancelled && c?.googleReviewLink) setReviewLink(c.googleReviewLink) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [job.clientName])

  const statusColour: Record<JobStatus, string> = {
    pending: 'var(--text-muted)',
    'in-progress': 'var(--status-warn)',
    departing: 'var(--brand-blue-light)',
    done: 'var(--brand-green)',
  }
  const statusLabel: Record<JobStatus, string> = {
    pending: 'Pending', 'in-progress': 'In progress', departing: 'Departing', done: 'Complete',
  }

  return (
    <div className="card overflow-hidden"
      style={{
        borderColor: status === 'in-progress' ? 'var(--status-warn)' : status === 'departing' ? 'var(--brand-blue-light)' : status === 'done' ? 'var(--brand-green)' : undefined,
        opacity: status === 'done' ? 0.7 : 1,
      }}>

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{job.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">{job.clientName}</h3>
              <span className="text-xs font-mono flex-shrink-0" style={{ color: statusColour[status] }}>{statusLabel[status]}</span>
            </div>
            <p className="text-text-muted text-xs mt-0.5">{job.jobType}</p>
            <div className="flex gap-3 mt-1 flex-wrap text-xs">
              <span className="text-text-secondary">{job.scheduledArrival}</span>
              <span className="text-text-muted">~{job.estimatedDuration}m</span>
              {job.price && <span className="font-semibold" style={{ color: 'var(--brand-green)' }}>£{job.price}</span>}
              {jobState.gpsTriggered && <span className="badge badge-green">GPS</span>}
            </div>
          </div>
        </div>
        {status === 'done' && (
          <div className="mt-2 pt-2 border-t border-surface-border flex gap-3 text-xs text-text-muted">
            <span>{arrivedAt} {'->'} {finishedAt} - {actualDuration}m</span>
            {actualDuration && <span style={{ color: actualDuration > job.estimatedDuration ? 'var(--status-warn)' : 'var(--brand-green)' }}>({actualDuration > job.estimatedDuration ? '+' : ''}{actualDuration - job.estimatedDuration}m)</span>}
          </div>
        )}

        {profile && (profile.accessNotes || profile.dogOnSite || profile.parkingNotes || profile.visitCount > 0) && (
          <div className="mt-2 pt-2 border-t border-surface-border">
            <button
              onClick={() => setProfileExpanded(v => !v)}
              className="flex items-center justify-between w-full text-xs text-text-secondary"
            >
              <span className="flex items-center gap-2">
                <span>Property notes</span>
                {profile.dogOnSite && <span className="badge badge-warn">Dog on site</span>}
                {profile.visitCount > 0 && <span className="text-text-muted">visit #{profile.visitCount + 1}</span>}
              </span>
              <span className="text-text-muted">{profileExpanded ? '^' : 'v'}</span>
            </button>
            {profileExpanded && (
              <div className="mt-2 space-y-1 text-xs text-text-muted">
                {profile.accessNotes && <p>Access: {profile.accessNotes}</p>}
                {profile.parkingNotes && <p>Parking: {profile.parkingNotes}</p>}
                {!profile.accessNotes && !profile.parkingNotes && (
                  <p className="italic">No saved notes yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {status === 'pending' && (
        <div className="px-4 pb-3 space-y-2">
          <OnMyWayPanel job={job} />
          <button onClick={onArrive} className="btn-primary w-full py-3 text-sm">Mark Arrived</button>
        </div>
      )}

      {status === 'in-progress' && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
          <div>
            <p className="text-xs text-text-muted mb-2">
              Before photos ({photosBefore.length})
              {photosBefore.length === 0 && <span className="ml-2" style={{ color: 'var(--status-warn)' }}>Take before photos</span>}
            </p>
            <div className="flex gap-2 flex-wrap">
              {photosBefore.map((p, i) => <img key={i} src={p.url} alt="before" className="w-14 h-14 rounded-lg object-cover" />)}
              <button onClick={() => onPhoto('before')} className="w-14 h-14 rounded-lg border border-dashed flex items-center justify-center text-xl text-text-muted" style={{ borderColor: 'var(--surface-border)' }}>+</button>
            </div>
          </div>
          <textarea value={jobState.notes} onChange={e => onNotesChange(e.target.value)} placeholder="Notes (saved to calendar)..." className="w-full bg-surface-muted rounded-lg p-3 text-sm text-text-primary resize-none border border-surface-border focus:border-brand-green focus:outline-none" rows={2} />
          <UpsellPanel job={job} />
          <button onClick={onStartDeparture} className="btn-primary w-full py-3 text-sm" style={{ background: 'var(--brand-blue)' }}>Job done - ready to leave</button>
        </div>
      )}

      {status === 'done' && (() => {
        const afterPhoto = photosAfter.find(p => p.url.startsWith('https://'))?.url
        if (!reviewLink) return null
        const waLink = buildReviewRequestLink({
          clientName: job.clientName,
          afterPhotoUrl: afterPhoto,
          googleReviewLink: reviewLink,
        })
        return (
          <div className="px-4 pb-4 border-t border-surface-border pt-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full py-3 text-sm text-center block"
              style={{ background: 'var(--brand-green)' }}
            >
              Request Google Review via WhatsApp
            </a>
            <p className="text-text-muted text-xs text-center mt-2">
              Opens WhatsApp with a pre-filled message. You pick the contact.
            </p>
          </div>
        )
      })()}

      {status === 'departing' && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
          <div>
            <p className="text-xs text-text-muted mb-2">
              After photos ({photosAfter.length})
              {photosAfter.length === 0 && <span className="ml-2" style={{ color: 'var(--status-warn)' }}>Take after photos</span>}
            </p>
            <div className="flex gap-2 flex-wrap">
              {photosAfter.map((p, i) => <img key={i} src={p.url} alt="after" className="w-14 h-14 rounded-lg object-cover" />)}
              <button onClick={() => onPhoto('after')} className="w-14 h-14 rounded-lg border border-dashed flex items-center justify-center text-xl text-text-muted" style={{ borderColor: 'var(--surface-border)' }}>+</button>
            </div>
          </div>

          <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-secondary">Post to Facebook</p>
              {facebookPosted && <span className="badge badge-blue">Posted</span>}
            </div>
            {!facebookPosted && !showFbForm && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {['after-short','before-after','seasonal'].map(t => (
                    <button key={t} onClick={() => setFbTemplate(t)} className="flex-1 py-1.5 rounded text-xs font-medium transition-all" style={{ background: fbTemplate === t ? 'var(--brand-blue)' : 'var(--surface-card)', color: fbTemplate === t ? 'white' : 'var(--text-muted)' }}>
                      {t === 'after-short' ? 'Short' : t === 'before-after' ? 'B&A' : 'Seasonal'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFbForm(true)} className="btn-primary flex-1 py-2 text-xs" style={{ background: 'var(--brand-blue)' }}>Post now</button>
                  <button className="btn-secondary px-3 py-2 text-xs">Skip</button>
                </div>
              </div>
            )}
            {!facebookPosted && showFbForm && (
              <div className="space-y-2">
                <input value={fbOutcome} onChange={e => setFbOutcome(e.target.value)} placeholder="Outcome line (e.g. 'Looking great for summer')" className="w-full bg-surface-card rounded-lg px-3 py-2 text-sm text-text-primary border border-surface-border focus:border-brand-blue focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowFbForm(false); onFacebookPost(fbTemplate, fbOutcome) }} className="btn-primary flex-1 py-2 text-xs" style={{ background: 'var(--brand-blue)' }}>Post</button>
                  <button onClick={() => setShowFbForm(false)} className="btn-secondary px-3 py-2 text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={onComplete} disabled={isUpdating} className="btn-primary w-full py-3 text-sm">
            {isUpdating ? 'Logging...' : 'Complete & Update Calendar'}
          </button>
        </div>
      )}
    </div>
  )
}

function UpsellPanel({ job }: { job: ScheduledJob }) {
  const [open, setOpen] = useState(false)
  const [spotted, setSpotted] = useState('')
  const [service, setService] = useState<UpsellService>('fence-repair')
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedState, setSavedState] = useState<null | { ok: boolean; webhookFired: boolean }>(null)

  if (savedState) {
    return (
      <div className="rounded-xl p-3 border" style={{
        borderColor: 'var(--brand-green)', background: 'var(--surface-muted)',
      }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--brand-green)' }}>
          Captured for follow-up
          {savedState.webhookFired ? ' - sent to Kommo' : ' - saved locally (no n8n webhook)'}
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full py-2 text-xs">
        Spotted something?
      </button>
    )
  }

  const save = async () => {
    if (!spotted.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: job.clientName,
          address: job.address || '',
          jobId: job.id,
          spotted: spotted.trim(),
          service,
          estimatedPrice: estimatedPrice ? Number(estimatedPrice) : undefined,
        }),
      })
      const data = await res.json()
      setSavedState({ ok: !!data.ok, webhookFired: !!data.webhookFired })
    } catch {
      setSavedState({ ok: false, webhookFired: false })
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-3 border space-y-2"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
      <p className="text-xs font-semibold text-text-secondary">Spotted something?</p>
      <textarea
        value={spotted}
        onChange={e => setSpotted(e.target.value)}
        placeholder="What did you notice? (e.g. fence panel rotting at the back)"
        rows={2}
        className="w-full bg-surface-card rounded-lg px-3 py-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
      />
      <select
        value={service}
        onChange={e => setService(e.target.value as UpsellService)}
        className="w-full bg-surface-card rounded-lg px-3 py-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
      >
        {UPSELL_SERVICES.map(s => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        step="5"
        value={estimatedPrice}
        onChange={e => setEstimatedPrice(e.target.value)}
        placeholder="Rough £ estimate (optional)"
        className="w-full bg-surface-card rounded-lg px-3 py-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !spotted.trim()} className="btn-primary flex-1 py-2 text-xs">
          {saving ? 'Saving...' : 'Save & follow up'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-secondary px-3 py-2 text-xs">Cancel</button>
      </div>
    </div>
  )
}

function OnMyWayPanel({ job }: { job: ScheduledJob }) {
  const [open, setOpen] = useState(false)
  const [eta, setEta] = useState<number | null>(null)
  const [etaLoading, setEtaLoading] = useState(false)
  const [message, setMessage] = useState('')

  const refreshPreview = (mins: number | null) => {
    setMessage(buildOnMyWayMessage({
      clientName: job.clientName,
      etaMinutes: mins ?? undefined,
    }))
  }

  const openPanel = () => {
    setOpen(true)
    refreshPreview(eta)
    if (eta === null && !etaLoading) {
      setEtaLoading(true)
      // Best-effort ETA: ask the browser for current position, then call
      // Distance Matrix. If anything fails, leave eta null - the message
      // falls back to "shortly".
      if (!navigator.geolocation || !job.address) {
        setEtaLoading(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const raw = await estimateEtaMinutes(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            job.address
          )
          const rounded = raw !== null ? roundEta(raw) : null
          setEta(rounded)
          refreshPreview(rounded)
          setEtaLoading(false)
        },
        () => setEtaLoading(false),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      )
    }
  }

  const send = () => {
    // Reuse the encoded link, but with the (possibly edited) message
    const encoded = encodeURIComponent(message)
    const link = `https://wa.me/?text=${encoded}`
    void buildOnMyWayLink   // keep import live; defensive against tree-shake
    window.open(link, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={openPanel}
        className="btn-secondary w-full py-2 text-xs"
      >
        Send on-my-way to {job.clientName.split(' ')[0]}
      </button>
    )
  }

  return (
    <div className="rounded-xl p-3 border space-y-2"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-secondary">On-my-way preview</p>
        {etaLoading && <span className="text-text-muted text-xs">Calculating ETA...</span>}
        {!etaLoading && eta !== null && <span className="text-text-muted text-xs">ETA ~{eta} min</span>}
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        className="w-full bg-surface-card rounded-lg px-3 py-2 text-sm text-text-primary border border-surface-border focus:border-brand-green focus:outline-none resize-none"
      />
      <div className="flex gap-2">
        <button onClick={send} className="btn-primary flex-1 py-2 text-xs">Send via WhatsApp</button>
        <button onClick={() => setOpen(false)} className="btn-secondary px-3 py-2 text-xs">Cancel</button>
      </div>
      <p className="text-text-muted text-xs">
        Opens WhatsApp - you pick the contact. Never sends automatically.
      </p>
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { href: '/dashboard', icon: 'H', label: 'Home', key: 'home' },
    { href: '/plan', icon: 'P', label: 'Plan', key: 'plan' },
    { href: '/live', icon: 'L', label: 'Live', key: 'live' },
    { href: '/barry', icon: 'B', label: 'Barry', key: 'barry' },
    { href: '/invoices', icon: 'I', label: 'Invoices', key: 'invoices' },
  ]
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <Link key={item.key} href={item.href} className={`nav-item ${active === item.key ? 'active' : ''}`}>
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
