'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const PIN_LENGTH = 6

export default function LoginPage() {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const session = sessionStorage.getItem('wgp_auth')
    if (session === 'true') {
      router.replace('/dashboard')
    }
    inputRefs.current[0]?.focus()
  }, [router])

  const submitPin = useCallback(async (fullPin: string) => {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      })

      if (res.ok) {
        sessionStorage.setItem('wgp_auth', 'true')
        router.replace('/dashboard')
      } else {
        setError(true)
        setShake(true)
        setPin(Array(PIN_LENGTH).fill(''))
        setTimeout(() => {
          setShake(false)
          inputRefs.current[0]?.focus()
        }, 600)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const digit = value.slice(-1)
    const newPin = [...pin]
    newPin[index] = digit
    setPin(newPin)
    setError(false)

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === PIN_LENGTH - 1) {
      const fullPin = [...newPin].join('')
      if (fullPin.length === PIN_LENGTH) {
        submitPin(fullPin)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const newPin = [...pin]
      newPin[index - 1] = ''
      setPin(newPin)
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('')
      if (fullPin.length === PIN_LENGTH) submitPin(fullPin)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH)
    const newPin = Array(PIN_LENGTH).fill('')
    pasted.split('').forEach((d, i) => { newPin[i] = d })
    setPin(newPin)
    if (pasted.length === PIN_LENGTH) submitPin(pasted)
    else inputRefs.current[pasted.length]?.focus()
  }

  return (
    <div className="mesh-bg min-h-dvh flex flex-col items-center justify-center px-6">

      <div className="stagger-1 flex flex-col items-center mb-12">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center shadow-2xl">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 28 L16 44 L24 40 L32 44 L28 28Z" fill="#2E6DB4" opacity="0.8"/>
              <path d="M15 18 Q15 28 24 28 Q33 28 33 18 Q33 10 24 10 Q15 10 15 18Z" fill="#2E6DB4"/>
              <path d="M16 22 L24 15 L32 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <rect x="21" y="22" width="6" height="6" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
              <line x1="24" y1="10" x2="24" y2="4" stroke="#2DAA6B" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="2" r="3" fill="#2DAA6B"/>
              <circle cx="19" cy="4" r="2.5" fill="#2DAA6B"/>
              <circle cx="29" cy="4" r="2.5" fill="#2DAA6B"/>
              <circle cx="16" cy="8" r="2" fill="#1E8A8A" opacity="0.8"/>
              <circle cx="32" cy="8" r="2" fill="#1E8A8A" opacity="0.8"/>
            </svg>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-brand-green opacity-10 blur-xl scale-150"/>
        </div>

        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          WGP Planner
        </h1>
        <p className="text-text-muted text-sm mt-1 font-body">
          Wirral Garden & Property
        </p>
      </div>

      <div className="stagger-2 w-full max-w-xs">
        <p className="text-text-secondary text-sm text-center mb-6 font-body">
          Enter your PIN to continue
        </p>

        <div
          className={`flex gap-3 justify-center mb-4 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}
          style={shake ? {
            animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
          } : {}}
        >
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`pin-digit ${error ? 'border-status-alert' : ''} ${loading ? 'opacity-50' : ''}`}
              disabled={loading}
              autoComplete="off"
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm animate-fade-in" style={{ color: 'var(--status-alert)' }}>
            Incorrect PIN - try again
          </p>
        )}

        {loading && (
          <div className="flex justify-center mt-4">
            <div className="spinner"/>
          </div>
        )}
      </div>

      <div className="stagger-3 absolute bottom-8 text-center">
        <p className="text-text-muted text-xs font-body">
          Port Sunlight, Wirral - CH62
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          10%, 90%  { transform: translateX(-2px); }
          20%, 80%  { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60%  { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
