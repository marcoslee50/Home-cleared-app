'use client'

import { useState, useEffect } from 'react'
import type { PublishedPlan } from '@/lib/published-plan'

// Public, no-auth read-only view for Barry. Marcos shares this URL.

export default function BarryDayViewPage() {
  const [plan, setPlan] = useState<PublishedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/plan/published')
      .then(r => r.json())
      .then(d => {
        if (d.ok) setPlan(d.plan)
        else setError(d.reason || 'No plan published yet today')
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">Today's plan</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      <div className="page-content">
        {loading && (
          <div className="flex justify-center py-16"><div className="spinner"/></div>
        )}

        {error && !loading && (
          <div className="card p-6 text-center">
            <p className="text-text-secondary text-sm">{error}</p>
            <p className="text-text-muted text-xs mt-2">Marcos will send today's plan once he builds it.</p>
          </div>
        )}

        {plan && !loading && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-text-muted text-xs">Pickup</p>
                  <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-teal)' }}>{plan.startTime}</p>
                  <p className="text-text-muted text-xs">{plan.pickupLocation}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Drop-off</p>
                  <p className="font-display text-lg font-bold" style={{ color: 'var(--brand-blue-light)' }}>
                    {plan.barryDropoffTime || '-'}
                  </p>
                  <p className="text-text-muted text-xs">New Brighton</p>
                </div>
              </div>
            </div>

            {plan.flags.length > 0 && (
              <div className="card p-4" style={{ borderColor: 'var(--status-warn)' }}>
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--status-warn)' }}>
                  Heads up
                </p>
                {plan.flags.map((f, i) => (
                  <p key={i} className="text-text-secondary text-sm mt-1">{f}</p>
                ))}
              </div>
            )}

            {plan.jobs.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-text-secondary text-sm">No jobs assigned for today.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Jobs ({plan.jobs.length})</p>
                </div>
                {plan.jobs.map((j, i) => (
                  <div
                    key={i}
                    className={`px-4 py-3 ${i < plan.jobs.length - 1 ? 'border-b border-surface-border' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{j.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <p className="text-text-primary text-sm font-semibold">{j.firstName} - {j.area}</p>
                          <p className="font-mono text-xs text-text-secondary flex-shrink-0">{j.scheduledArrival}</p>
                        </div>
                        <p className="text-text-muted text-xs mt-0.5">{j.jobType} - ~{j.estimatedDuration} min</p>
                        {j.notes && <p className="text-text-secondary text-xs mt-1">{j.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card p-3 text-center">
              <p className="text-text-muted text-xs">
                Estimated finish: <span className="text-text-secondary">{plan.estimatedFinish}</span>
              </p>
            </div>

            <p className="text-text-muted text-xs text-center mt-4">
              Wirral Garden & Property
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
