import { NextRequest, NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const pathname = formData.get('pathname') as string
    const clientName = formData.get('clientName') as string
    const jobDate = formData.get('jobDate') as string
    const type = formData.get('type') as 'before' | 'after'

    if (!file || !pathname) {
      return NextResponse.json({ error: 'Missing file or pathname' }, { status: 400 })
    }

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: 'image/jpeg',
    })

    const photo = {
      url: blob.url,
      blobUrl: blob.url,
      type,
      clientName,
      jobDate,
      uploadedAt: new Date().toISOString(),
      size: file.size,
    }

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const client = searchParams.get('client')
    const date = searchParams.get('date')

    if (!client || !date) {
      return NextResponse.json({ error: 'Missing client or date' }, { status: 400 })
    }

    const prefix = `jobs/${date}/${client}/`
    const { blobs } = await list({ prefix })

    const before = blobs
      .filter(b => b.pathname.includes('/before/'))
      .map(b => ({ url: b.url, blobUrl: b.url, type: 'before' as const, uploadedAt: b.uploadedAt }))

    const after = blobs
      .filter(b => b.pathname.includes('/after/'))
      .map(b => ({ url: b.url, blobUrl: b.url, type: 'after' as const, uploadedAt: b.uploadedAt }))

    return NextResponse.json({
      jobId: `${date}-${client}`,
      clientName: client,
      jobDate: date,
      before,
      after,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
