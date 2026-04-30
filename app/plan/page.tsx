'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DayPlan, ScheduledJob } from '@/lib/claude'

type PlanState = 'setup' | 'loading' | 'ready' | 'error'

interface SetupForm {
  startTime: string
  barryWorking: boolean
  barryDropoff: string
  barryStartTime: string
  startLocation: string
  specialTools: string
}

export default function PlanPage() {
  const [state, setState] = useState<PlanState>('setup')
  const [form, setForm] = useState<SetupForm>({
    startTime: '09:30',
    barryWorking: false,
    barryDropoff: '15:00',
    barryStartTime: '09:30',
    startLocation: 'New Brighton',
    specialTools: '',
  })
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [error, setError] = useState('')
  const [jobCount, setJobCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/plan')
      .then(r => r.json())
      .then(d => setJobCount(d.jobs?.length ?? 0))
      .catch(() => setJobCount(null))
  }, [])

  const buildPlan = async () => {
    setState('loading')
    setError('')

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          ...form,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to build plan')
      if (!data.plan) {
        setState('setup')
        setError(data.message || 'No jobs found on your calendar today.')
        return
      }

      sessionStorage.setItem('wgp_plan', JSON.stringify(data.plan))
      setPlan(data.plan)
      setState('ready')
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-4 flex items-center gap-1 hover:text-text-secondary transition-colors">
          {'<-'} Back
        </Link>
        <h1 className="font-display text-2xl font-bold text-text-primary">Plan Today</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
        {jobCount !== null && (
          <span className={`badge mt-2 ${jobCount > 0 ? 'badge-green' : 'badge-muted'}`}>
            {jobCount > 0 ? `${jobCount} jobs on calendar` : 'No jobs found'}
          </span>
        )}
      </header>

      <div className="page-content">

        {(state === 'setup' || state === 'error') && (
          <div className="space-y-4">

            <div className="card p-4">
              <label className="text-text-muted text-xs font-mono uppercase tracking-widest block mb-3">
                Start time
              </label>
              <div className="flex gap-2">
                {['08:00','08:30','09:00','09:30','10:00'].map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, startTime: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      form.startTime === t
                        ? 'text-white'
                        : 'bg-surface-muted text-text-secondary hover:text-text-primary'
                    }`}
                    style={form.startTime === t ? { background: 'var(--brand-green)' } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <label className="text-text-muted text-xs font-mono uppercase tracking-widest block mb-3">
                Is Barry working today?
              </label>
              <div className="flex gap-3 mb-4">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => setForm(f => ({ ...f, barryWorking: v }))}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                      form.barryWorking === v
                        ? 'text-white'
                        : 'bg-surface-muted text-text-secondary'
                    }`}
                    style={form.barryWorking === v
                      ? { background: v ? 'var(--brand-teal)' : 'var(--surface-muted)', color: v ? 'white' : 'var(--text-muted)' }
                      : {}
                    }
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>

              {form.barryWorking && (
                <div className="space-y-3 pt-3 border-t border-surface-border">
                  <div>
                    <label className="text-text-muted text-xs block mb-2">Barry drop-off by</label>
                    <div className="flex gap-2">
                      {['14:00','14:30','15:00','15:30','16:00'].map(t => (
                        <button
                          key={t}
                          onClick={() => setForm(f => ({ ...f, barryDropoff: t }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                            form.barryDropoff === t
                              ? 'text-white'
                              : 'bg-surface-muted text-text-secondary'
                          }`}
                          style={form.barryDropoff === t ? { background: 'var(--brand-teal)' } : {}}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-4">
              <label className="text-text-muted text-xs font-mono uppercase tracking-widest block mb-3">
                Starting from
              </label>
              <div className="flex gap-2">
                {['New Brighton', 'Port Sunlight', 'Other'].map(loc => (
                  <button
                    key={loc}
                    onClick={() => setForm(f => ({ ...f, startLocation: loc }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      form.startLocation === loc
                        ? 'text-white'
                        : 'bg-surface-muted text-text-secondary'
                    }`}
                    style={form.startLocation === loc ? { background: 'var(--brand-blue)' } : {}}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <label className="text-text-muted text-xs font-mono uppercase tracking-widest block mb-3">
                Special tools / materials needed?
              </label>
              <textarea
                value={form.specialTools}
                onChange={e => setForm(f => ({ ...f, specialTools: e.target.value }))}
                placeholder="e.g. roller mower for Pippa, turf from Wirral Turf Supplies, ladder for Dave..."
                className="w-full bg-surface-muted rounded-lg p-3 text-text-primary text-sm resize-none border border-surface-border focus:border-brand-green focus:outline-none transition-colors"
                style={{ minHeight: 80 }}
              />
            </div>

            {error && (
              <div className="card p-4" style={{ borderColor: 'var(--status-alert)' }}>
                <p className="text-sm" style={{ color: 'var(--status-alert)' }}>! {error}</p>
              </div>
            )}

            <button
              onClick={buildPlan}
              disabled={jobCount === 0}
              className="btn-primary w-full py-4 text-base"
              style={jobCount === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              Build Today's Route
            </button>

            {jobCount === 0 && (
              <p className="text-text-muted text-xs text-center">
                No jobs on today's calendar. Add jobs in Google Calendar first.
              </p>
            )}
          </div>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative">
              <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }}/>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-semibold">Building your route...</p>
              <p className="text-text-muted text-sm mt-1">Reading calendar - Optimising sequence - Calculating times</p>
            </div>
          </div>
        )}

        {state === 'ready' && plan && (
          <PlanDisplay plan={plan} onReset={() => setState('setup')} />
        )}

      </div>

      <nav className="bottom-nav">
        <Link href="/dashboard" className="nav-item">
          <span className="nav-icon">H</span><span>Home</span>
        </Link>
        <Link href="/plan" className="nav-item active">
          <span className="nav-icon">P</span><span>Plan</span>
        </Link>
        <Link href="/live" className="nav-item">
          <span className="nav-icon">L</span><span>Live</span>
        </Link>
        <Link href="/barry" className="nav-item">
          <span className="nav-icon">B</span><span>Barry</span>
        </Link>
      </nav>
    </div>
  )
}

function PlanDisplay({ plan, onReset }: { plan: DayPlan; onReset: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyBarry = () => {
    navigator.clipboard.writeText(plan.barrySummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-display text-xl font-bold" style={{ color: 'var(--brand-green)' }}>
              £{plan.confirmedRevenue}
            </div>
            <div className="text-text-muted text-xs">Confirmed</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold text-text-secondary">
              {plan.jobs.length}
            </div>
            <div className="text-text-muted text-xs">Jobs</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold" style={{ color: 'var(--brand-blue-light)' }}>
              {plan.estimatedFinish}
            </div>
            <div className="text-text-muted text-xs">Finish</div>
          </div>
        </div>
      </div>

      {plan.flags.length > 0 && (
        <div className="card p-4" style={{ borderColor: 'var(--status-warn)' }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--status-warn)' }}>
            Flags
          </p>
          {plan.flags.map((flag, i) => (
            <p key={i} className="text-sm text-text-secondary mt-1">{flag}</p>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Schedule</p>
        </div>
        {plan.jobs.map((job, i) => (
          <JobRow key={job.id} job={job} index={i} isLast={i === plan.jobs.length - 1} />
        ))}
        <div className="px-4 py-3 border-t border-surface-border" style={{ background: 'var(--surface-muted)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Est. finish</span>
            <span className="font-semibold text-text-primary">{plan.estimatedFinish}</span>
          </div>
          {plan.tbcRevenue > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-muted">TBC revenue</span>
              <span className="text-text-secondary">£{plan.tbcRevenue} est.</span>
            </div>
          )}
        </div>
      </div>

      {plan.barrySummary && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Barry's message</p>
            <button onClick={copyBarry} className="badge badge-green" style={{ cursor: 'pointer' }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {plan.barrySummary}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/live" className="btn-primary flex-1 text-center py-3 text-sm">
          Start Day
        </Link>
        <button onClick={onReset} className="btn-secondary px-4 py-3 text-sm">
          Rebuild
        </button>
      </div>
    </div>
  )
}

function JobRow({ job, index: _index, isLast }: { job: ScheduledJob; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`px-4 py-3 cursor-pointer hover:bg-surface-muted transition-colors ${!isLast ? 'border-b border-surface-border' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="text-center flex-shrink-0" style={{ width: 28 }}>
          <div className="text-lg">{job.emoji}</div>
          <div className="text-text-muted text-xs font-mono">{job.sequence}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-text-primary font-semibold text-sm truncate">{job.clientName}</p>
            <p className="font-mono text-xs text-text-secondary flex-shrink-0">{job.scheduledArrival}</p>
          </div>
          <p className="text-text-muted text-xs mt-0.5">{job.jobType} - {job.estimatedDuration} min</p>
          {job.flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {job.flags.map((f, i) => <span key={i} className="badge badge-warn text-xs">{f}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {job.price ? (
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--brand-green)' }}>
              £{job.price}
            </span>
          ) : (
            <span className="badge badge-muted">TBC</span>
          )}
          <span className="text-text-muted text-xs">{expanded ? 'v' : '>'}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-1.5">
          {job.address && (
            <p className="text-text-secondary text-xs">{job.address}</p>
          )}
          {job.operative && (
            <p className="text-text-muted text-xs">
              {job.operative === 'both' ? 'Marcos + Barry' : job.operative === 'barry' ? 'Barry (solo)' : 'Marcos (solo)'}
            </p>
          )}
          {job.tools.length > 0 && (
            <p className="text-text-muted text-xs">Tools: {job.tools.join(', ')}</p>
          )}
          {job.notes && (
            <p className="text-text-muted text-xs">Notes: {job.notes}</p>
          )}
          <p className="text-text-muted text-xs">
            Take before & after photos
          </p>
        </div>
      )}
    </div>
  )
}
