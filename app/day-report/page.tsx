'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DayReport, getAccuracyColour } from '@/lib/day-report'
import { DayPlan } from '@/lib/claude'
import { buildReviewRequestLink } from '@/lib/review-request'
import { ClientProfile, pitchHidden } from '@/lib/client-profiles'
import { buildContractPitchMessage, buildContractPitchLink, checkPitchEligibility, monthlySaving } from '@/lib/contract-pitch'

export default function DayReportPage() {
  const [report, setReport] = useState<DayReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pitchProfiles, setPitchProfiles] = useState<ClientProfile[]>([])

  useEffect(() => {
    generateReport()
  }, [])

  // Load pitch-eligible profiles for the completed jobs (visitCount >= 3,
  // not on contract, not dismissed in last 30 days)
  useEffect(() => {
    if (!report?.completedJobs?.length) return
    let cancelled = false
    Promise.all(
      report.completedJobs.map(cj =>
        fetch(`/api/clients?name=${encodeURIComponent(cj.job.clientName)}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      if (cancelled) return
      const candidates = results
        .filter((p): p is ClientProfile => !!p)
        .filter(p => checkPitchEligibility(p).eligible && !pitchHidden(p))
      setPitchProfiles(candidates)
    })
    return () => { cancelled = true }
  }, [report])

  const [reviewLink, setReviewLink] = useState(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || '')
  useEffect(() => {
    fetch('/api/invoice-config')
      .then(r => r.ok ? r.json() : null)
      .then(c => { if (c?.googleReviewLink) setReviewLink(c.googleReviewLink) })
      .catch(() => {})
  }, [])

  const dismissPitch = async (clientName: string) => {
    setPitchProfiles(prev => prev.filter(p => p.clientName !== clientName))
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss-pitch', clientName }),
    })
  }

  const generateReport = async () => {
    setLoading(true)
    setError('')
    try {
      const planStr = sessionStorage.getItem('wgp_plan')
      const completedStr = sessionStorage.getItem('wgp_completed_jobs')
      if (!planStr) { setError('No plan found. Complete some jobs first.'); setLoading(false); return }

      const plan: DayPlan = JSON.parse(planStr)
      const completedJobs = completedStr ? JSON.parse(completedStr) : []

      const res = await fetch('/api/day-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, completedJobs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-4">
        <Link href="/live" className="text-text-muted text-sm mb-3 flex items-center gap-1">{'<-'} Back</Link>
        <h1 className="font-display text-2xl font-bold">Day Report</h1>
        <p className="text-text-secondary text-sm mt-1">{today}</p>
      </header>

      <div className="page-content">
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <p className="text-text-muted text-sm">Generating your day report...</p>
          </div>
        )}

        {error && (
          <div className="card p-4" style={{ borderColor: 'var(--status-alert)' }}>
            <p className="text-sm" style={{ color: 'var(--status-alert)' }}>! {error}</p>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-4">

            <div className="card p-5">
              <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-3">Summary</p>
              <p className="text-text-primary text-sm leading-relaxed">{report.narrative}</p>
              {report.highlights.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="text-text-secondary text-sm flex gap-2">
                      <span style={{ color: 'var(--brand-green)' }}>{'>'}</span> {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Jobs completed"
                value={`${report.jobsCompleted}/${report.jobsPlanned}`}
                colour={report.jobsCompleted === report.jobsPlanned ? 'var(--brand-green)' : 'var(--status-warn)'}
              />
              <MetricCard
                label="Revenue"
                value={`£${report.invoicedTotal}`}
                colour="var(--brand-green)"
              />
              <MetricCard
                label="Estimate accuracy"
                value={`${report.avgAccuracyPct}%`}
                colour={getAccuracyColour(report.avgAccuracyPct)}
              />
              <MetricCard
                label="Photos taken"
                value={String(report.totalPhotosTaken)}
                colour="var(--brand-blue-light)"
              />
              <MetricCard
                label="Facebook posts"
                value={String(report.facebookPostsCount)}
                colour="var(--brand-blue)"
              />
              <MetricCard
                label="Finish time"
                value={report.actualFinish}
                subtext={`Planned ${report.plannedFinish}`}
                colour="var(--text-secondary)"
              />
            </div>

            <div className="card p-4">
              <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-3">Timing breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'On schedule (+/-10 min)', value: report.onTimeJobs, colour: 'var(--brand-green)' },
                  { label: 'Ran over', value: report.lateJobs, colour: 'var(--status-warn)' },
                  { label: 'Finished early', value: report.earlyJobs, colour: 'var(--brand-blue-light)' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">{row.label}</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: row.colour }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {report.tomorrowFlags.length > 0 && (
              <div className="card p-4" style={{ borderColor: 'var(--status-warn)' }}>
                <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--status-warn)' }}>For tomorrow</p>
                {report.tomorrowFlags.map((f, i) => (
                  <p key={i} className="text-sm text-text-secondary mt-1">{f}</p>
                ))}
              </div>
            )}

            {pitchProfiles.length > 0 && (
              <div className="card overflow-hidden" style={{ borderColor: 'var(--brand-blue-light)' }}>
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--brand-blue-light)' }}>
                    Pitch monthly plan ({pitchProfiles.length})
                  </p>
                </div>
                {pitchProfiles.map(p => {
                  const message = buildContractPitchMessage(p.clientName)
                  const waLink = buildContractPitchLink(p.clientName, p.phone)
                  return (
                    <div key={p.clientName} className="px-4 py-3 border-b border-surface-border last:border-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-text-primary text-sm">{p.clientName}</p>
                          <p className="text-text-muted text-xs">
                            {p.visitCount} visits - currently £{p.averageJobDuration ? Math.round(p.totalSpend / p.visitCount) : '-'}/visit avg
                          </p>
                          <p className="text-text-muted text-xs">Monthly plan would save them ~£{monthlySaving()}/month</p>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary italic whitespace-pre-wrap rounded-lg px-3 py-2" style={{ background: 'var(--surface-muted)' }}>
                        {message}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(message)}
                          className="btn-secondary flex-1 py-2 text-xs"
                        >
                          Copy
                        </button>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary flex-1 py-2 text-xs text-center"
                          style={{ background: 'var(--brand-blue)' }}
                        >
                          Open WhatsApp
                        </a>
                        <button
                          onClick={() => dismissPitch(p.clientName)}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {report.completedJobs.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Request Google reviews</p>
                </div>
                {report.completedJobs.map(cj => {
                  const waLink = reviewLink
                    ? buildReviewRequestLink({
                        clientName: cj.job.clientName,
                        afterPhotoUrl: cj.afterPhotoUrl,
                        googleReviewLink: reviewLink,
                      })
                    : ''
                  return (
                    <div key={cj.job.id} className="px-4 py-3 flex items-center justify-between border-b border-surface-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm truncate">{cj.job.clientName}</p>
                        <p className="text-text-muted text-xs">{cj.finishedAt} - {cj.actualDuration}m</p>
                      </div>
                      {waLink ? (
                        <a href={waLink} target="_blank" rel="noopener noreferrer"
                          className="badge badge-green text-xs ml-3" style={{ cursor: 'pointer' }}>
                          Request review
                        </a>
                      ) : (
                        <span className="text-text-muted text-xs ml-3">Set review link in env</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Invoices to send</p>
                <span className="badge badge-warn">{report.invoicesToSend.length} pending</span>
              </div>
              {report.invoicesToSend.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-brand-green text-sm">All invoices sent</p>
                </div>
              ) : (
                <div>
                  {report.invoicesToSend.map(name => (
                    <div key={name} className="px-4 py-3 flex items-center justify-between border-b border-surface-border last:border-0">
                      <span className="text-text-primary text-sm">{name}</span>
                      <Link href={`/invoices/new?client=${encodeURIComponent(name)}`}
                        className="badge badge-green text-xs" style={{ cursor: 'pointer' }}>
                        Create
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {report.overdueInvoices.length > 0 && (
              <div className="card overflow-hidden" style={{ borderColor: 'var(--status-alert)' }}>
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--status-alert)' }}>
                    Overdue invoices ({report.overdueInvoices.length})
                  </p>
                </div>
                {report.overdueInvoices.map(inv => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between border-b border-surface-border last:border-0">
                    <div>
                      <p className="text-text-primary text-sm">{inv.clientName}</p>
                      <p className="text-text-muted text-xs">{inv.id} - £{inv.total.toFixed(2)} - due {new Date(inv.dueDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <Link href={`/invoices?highlight=${inv.id}`} className="badge badge-alert text-xs" style={{ cursor: 'pointer' }}>
                      Chase
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <Link href="/invoices" className="btn-primary w-full py-4 block text-center text-base">
              Manage All Invoices
            </Link>

          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: 'H', label: 'Home' },
          { href: '/plan', icon: 'P', label: 'Plan' },
          { href: '/live', icon: 'L', label: 'Live' },
          { href: '/barry', icon: 'B', label: 'Barry' },
          { href: '/invoices', icon: 'I', label: 'Invoices' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="nav-item">
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

function MetricCard({ label, value, colour, subtext }: { label: string; value: string; colour: string; subtext?: string }) {
  return (
    <div className="card p-4">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="font-display text-2xl font-bold" style={{ color: colour }}>{value}</p>
      {subtext && <p className="text-text-muted text-xs mt-0.5">{subtext}</p>}
    </div>
  )
}
