import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const correctPin = process.env.APP_PIN

    if (!correctPin) {
      console.error('APP_PIN environment variable not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (pin === correctPin) {
      const response = NextResponse.json({ ok: true })
      response.cookies.set('wgp_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      })
      return response
    }

    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
