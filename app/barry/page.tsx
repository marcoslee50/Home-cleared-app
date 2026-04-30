'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DayPlan } from '@/lib/claude'

function ShareDayViewButton() {
  const [shared, setShared] = useState(false)
  const dayViewUrl = typeof window !== 'undefined' ? `${window.location.origin}/barry/day` : '/barry/day'
  const message = `Morning Barry, here's today's plan: ${dayViewUrl}`
  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(dayViewUrl)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    } catch {}
  }

  return (
    <div className="card p-3 space-y-2" style={{ background: 'var(--surface-muted)' }}>
      <p className="text-text-muted text-xs">
        Read-only day view for Barry - no login needed.
      </p>
      <div className="flex gap-2">
        <a href={waLink} target="_blank" rel="noopener noreferrer"
          className="btn-primary flex-1 py-2 text-xs text-center" style={{ background: '#25D366' }}>
          Send via WhatsApp
        </a>
        <button onClick={copyLink} className="btn-secondary px-3 py-2 text-xs">
          {shared ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

export default function BarryPage() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('wgp_plan')
    if (stored) {
      const p: DayPlan = JSON.parse(stored)
      setPlan(p)
      if (p.barrySummary) setBriefing(p.barrySummary)
    }
  }, [])

  const regenerate = async () => {
    if (!plan) return
    setLoading(true)
    try {
      const res = await fetch('/api/barry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      setBriefing(data.briefing)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(briefing)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const openMessenger = () => {
    window.open('fb-messenger://user/barry.mccardle', '_blank')
    setTimeout(() => window.open('https://www.messenger.com', '_blank'), 500)
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/dashboard" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <h1 className="font-display text-2xl font-bold text-text-primary">Barry's Briefing</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      <div className="page-content">
        {!plan ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-5">B</div>
            <h2 className="font-display text-xl font-bold text-text-primary mb-3">
              No route planned yet
            </h2>
            <p className="text-text-muted text-sm mb-6">
              Plan today's route first - the Barry briefing is generated automatically.
            </p>
            <Link href="/plan" className="btn-primary">Plan Today's Route</Link>
          </div>
        ) : (
          <div className="space-y-4">

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(30,138,138,0.2)' }}>
                  B
                </div>
                <div>
                  <p className="text-text-primary font-semibold text-sm">Barry McCardle</p>
                  <p className="text-text-muted text-xs">New Brighton - {plan.barryDropoffTime ? `Drop off by ${plan.barryDropoffTime}` : 'Solo day for Marcos'}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest">
                  Messenger message
                </p>
                <button
                  onClick={regenerate}
                  disabled={loading}
                  className="text-text-muted text-xs hover:text-text-secondary transition-colors"
                >
                  {loading ? '...' : 'Regenerate'}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="spinner"/>
                  <span className="text-text-muted text-sm">Rewriting briefing...</span>
                </div>
              ) : briefing ? (
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--surface-muted)', color: 'var(--text-secondary)' }}
                >
                  {briefing}
                </div>
              ) : (
                <p className="text-text-muted text-sm">No briefing generated yet.</p>
              )}
            </div>

            {briefing && (
              <div className="space-y-3">
                <button
                  onClick={copy}
                  className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
                  style={copied ? { background: 'var(--brand-teal)' } : {}}
                >
                  {copied ? 'Copied to clipboard!' : 'Copy message'}
                </button>

                <ShareDayViewButton />

                <button
                  onClick={openMessenger}
                  className="btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  Open Facebook Messenger
                </button>
              </div>
            )}

            {plan.jobs.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-text-muted text-xs font-mono uppercase tracking-widest">
                    Today's jobs
                  </p>
                </div>
                {plan.jobs.map((job, i) => (
                  <div
                    key={job.id}
                    className={`px-4 py-3 flex items-center gap-3 ${i < plan.jobs.length - 1 ? 'border-b border-surface-border' : ''}`}
                  >
                    <span className="text-lg">{job.emoji}</span>
                    <div className="flex-1">
                      <p className="text-text-primary text-sm font-medium">{job.clientName}</p>
                      <p className="text-text-muted text-xs">{job.scheduledArrival} - ~{job.estimatedDuration} min</p>
                    </div>
                    <span className="text-xs">
                      {job.operative === 'both' ? 'M+B' : job.operative === 'barry' ? 'B' : 'M'}
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <Link href="/dashboard" className="nav-item"><span className="nav-icon">H</span><span>Home</span></Link>
        <Link href="/plan" className="nav-item"><span className="nav-icon">P</span><span>Plan</span></Link>
        <Link href="/live" className="nav-item"><span className="nav-icon">L</span><span>Live</span></Link>
        <Link href="/barry" className="nav-item active"><span className="nav-icon">B</span><span>Barry</span></Link>
      </nav>
    </div>
  )
}
