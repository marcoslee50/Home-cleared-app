import { NextRequest, NextResponse } from 'next/server'
import { postToFacebookPage, DEFAULT_TEMPLATES } from '@/lib/facebook'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientArea, jobType, jobEmoji, outcome, photoUrls, templateId, customVars } = body

    const result = await postToFacebookPage({
      clientArea,
      jobType,
      jobEmoji,
      outcome,
      photoUrls: photoUrls || [],
      templateId: templateId || 'after-short',
      customVars,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Facebook post error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    templates: Object.entries(DEFAULT_TEMPLATES).map(([id, body]) => ({
      id,
      body,
      variables: ['area', 'jobType', 'emoji', 'outcome', 'phone', 'website'],
    })),
  })
}
