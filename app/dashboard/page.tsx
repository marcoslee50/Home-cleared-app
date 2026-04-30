'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TodaySummary {
  jobCount: number
  totalRevenue: number
  tbcRevenue: number
  hasJobs: boolean
}

interface HealthSummary {
  green: number
  amber: number
  red: number
  new: number
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState('')
  const [greeting, setGreeting] = useState('')
  const router = useRouter()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'
      }))
      const hour = now.getHours()
      setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/plan')
      .then(r => r.json())
      .then(data => {
        const jobs = data.jobs || []
        const confirmed = jobs.reduce((sum: number, j: { price?: number }) =>
          sum + (j.price || 0), 0)
        setSummary({
          jobCount: jobs.length,
          totalRevenue: confirmed,
          tbcRevenue: 0,
          hasJobs: jobs.length > 0,
        })
      })
      .catch(() => setSummary({ jobCount: 0, totalRevenue: 0, tbcRevenue: 0, hasJobs: false }))
      .finally(() => setLoading(false))

    fetch('/api/client-health')
      .then(r => r.json())
      .then(d => setHealth(d.summary))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('wgp_auth')
    document.cookie = 'wgp_session=; Max-Age=0; path=/'
    router.replace('/')
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="app-shell mesh-bg">
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest">{time}</p>
          <button
            onClick={handleLogout}
            className="text-text-muted text-xs hover:text-text-secondary transition-colors"
          >
            Lock
          </button>
        </div>
        <div className="stagger-1">
          <h1 className="font-display text-3xl font-bold text-text-primary leading-tight">
            {greeting},<br/>Marcos.
          </h1>
          <p className="text-text-secondary text-sm mt-2 font-body">{today}</p>
        </div>
      </header>

      <div className="page-content">
        <div className="stagger-2 card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-secondary text-xs font-mono uppercase tracking-widest">
              Today at a glance
            </h2>
            {loading && <div className="spinner" style={{ width: 14, height: 14 }}/>}
          </div>

          {loading ? (
            <div className="flex gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex-1 h-16 rounded-lg bg-surface-muted animate-pulse"/>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 bg-surface-muted rounded-lg p-3 text-center">
                <div className="font-display text-2xl font-bold" style={{ color: 'var(--brand-green)' }}>
                  {summary?.jobCount ?? 0}
                </div>
                <div className="text-text-muted text-xs mt-1">Jobs</div>
              </div>
              <div className="flex-1 bg-surface-muted rounded-lg p-3 text-center">
                <div className="font-display text-2xl font-bold" style={{ color: 'var(--brand-blue-light)' }}>
                  {summary?.totalRevenue ? `£${summary.totalRevenue}` : '-'}
                </div>
                <div className="text-text-muted text-xs mt-1">Revenue</div>
              </div>
              <div className="flex-1 bg-surface-muted rounded-lg p-3 text-center">
                <div className="font-display text-2xl font-bold text-text-secondary">
                  {summary?.hasJobs ? '✓' : '-'}
                </div>
                <div className="text-text-muted text-xs mt-1">Calendar</div>
              </div>
            </div>
          )}
        </div>

        {health && (health.green + health.amber + health.red + health.new > 0) && (
          <div className="stagger-2 card p-4 mb-4">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-3">Client health</p>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/clients?health=green" className="bg-surface-muted rounded-lg p-3 text-center block">
                <div className="font-display text-2xl font-bold" style={{ color: 'var(--brand-green)' }}>{health.green}</div>
                <div className="text-text-muted text-xs mt-1">All good</div>
              </Link>
              <Link href="/clients?health=amber" className="bg-surface-muted rounded-lg p-3 text-center block">
                <div className="font-display text-2xl font-bold" style={{ color: 'var(--status-warn)' }}>{health.amber}</div>
                <div className="text-text-muted text-xs mt-1">Check in</div>
              </Link>
              <Link href="/clients?health=red" className="bg-surface-muted rounded-lg p-3 text-center block">
                <div className="font-display text-2xl font-bold" style={{ color: 'var(--status-alert)' }}>{health.red}</div>
                <div className="text-text-muted text-xs mt-1">At risk</div>
              </Link>
            </div>
          </div>
        )}

        <div className="stagger-3 space-y-3 mb-6">
          <Link href="/plan" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(45,170,107,0.15)' }}>
                <span>P</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">Plan Today's Route</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Morning setup - jobs, Barry, tools, schedule
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>

          <Link href="/live" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(46,109,180,0.15)' }}>
                <span>L</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">Live Updates</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Log arrivals, completions, recalculate route
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>

          <Link href="/barry" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(30,138,138,0.15)' }}>
                <span>B</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">Barry's Briefing</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Copy message for Facebook Messenger
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>

          <Link href="/clients" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(75,143,212,0.15)' }}>
                <span>C</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">Clients</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Property notes, access info, job history
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>

          <Link href="/quote" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(212,160,23,0.15)' }}>
                <span>Q</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">New Quote</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Build, send via WhatsApp, drop into calendar
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>

          <Link href="/settings" className="block">
            <div className="card card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(143,173,150,0.15)' }}>
                <span>S</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-primary font-semibold text-base">Settings</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Templates, Barry defaults, invoice details, review link
                </p>
              </div>
              <span className="text-text-muted text-lg">{'›'}</span>
            </div>
          </Link>
        </div>

        <div className="stagger-4 text-center py-4">
          <p className="text-text-muted text-xs font-body">
            Wirral Garden & Property - Port Sunlight
          </p>
          <p className="text-text-muted text-xs mt-1" style={{ opacity: 0.5 }}>
            The Gardener Who Notices
          </p>
        </div>
      </div>

      <nav className="bottom-nav">
        <Link href="/dashboard" className="nav-item active">
          <span className="nav-icon">H</span>
          <span>Home</span>
        </Link>
        <Link href="/plan" className="nav-item">
          <span className="nav-icon">P</span>
          <span>Plan</span>
        </Link>
        <Link href="/live" className="nav-item">
          <span className="nav-icon">L</span>
          <span>Live</span>
        </Link>
        <Link href="/barry" className="nav-item">
          <span className="nav-icon">B</span>
          <span>Barry</span>
        </Link>
      </nav>
    </div>
  )
}
