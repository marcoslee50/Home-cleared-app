// Facebook Graph API - post to WGP Facebook Page
// Uses long-lived Page Access Token (never expires when generated correctly)
// Template system: Marcos writes the templates, app fills in job variables

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

// -- Types --------------------------------------------------------------------

export interface FacebookPostData {
  clientArea: string
  jobType: string
  jobEmoji: string
  outcome?: string
  photoUrls: string[]
  templateId: string
  customVars?: Record<string, string>
}

export interface PostResult {
  postId: string
  url: string
  success: boolean
}

// -- Template system ----------------------------------------------------------
// Variables: {{area}}, {{jobType}}, {{outcome}}, {{emoji}}, {{phone}}, {{website}}

export const DEFAULT_TEMPLATES: Record<string, string> = {
  'after-short': `{{emoji}} Job done in {{area}}!

{{jobType}} completed today. {{outcome}}

{{phone}}
{{website}}

#WirralGarden #{{area}} #GardenMaintenance #Wirral`,

  'before-after': `{{emoji}} Transformation Tuesday - {{area}}

Before & after: {{jobType}} today.
{{outcome}}

If your garden needs attention, give us a call.
{{phone}} | {{website}}

#WirralGarden #Wirral #GardenTransformation #{{area}}`,

  'seasonal': `{{emoji}} Spring is here - and so are we!

{{jobType}} in {{area}} - another satisfied customer.
{{outcome}}

{{phone}}
{{website}}

#WirralGarden #SpringGarden #Wirral #{{area}}`,
}

// -- Fill template variables --------------------------------------------------

export function fillTemplate(templateId: string, data: FacebookPostData): string {
  const template = DEFAULT_TEMPLATES[templateId] || DEFAULT_TEMPLATES['after-short']

  const vars: Record<string, string> = {
    area: data.clientArea,
    jobType: data.jobType,
    emoji: data.jobEmoji,
    outcome: data.outcome || '',
    phone: process.env.INVOICE_PHONE || '07542 888 772',
    website: process.env.INVOICE_WEBSITE || 'wirralgardenandproperty.com',
    ...data.customVars,
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '')
}

// -- Upload photos to Facebook then post --------------------------------------

export async function postToFacebookPage(data: FacebookPostData): Promise<PostResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  if (!pageId || !token) {
    throw new Error('Facebook credentials not configured')
  }

  const message = fillTemplate(data.templateId, data)

  try {
    if (data.photoUrls.length > 0) {
      const photoIds = await Promise.all(
        data.photoUrls.slice(0, 10).map(url => uploadPhotoToFacebook(url, pageId, token))
      )

      const attachedMedia = photoIds.map(id => ({ media_fbid: id }))

      const postRes = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attached_media: attachedMedia,
          access_token: token,
        }),
      })

      const postData = await postRes.json()
      if (postData.error) throw new Error(postData.error.message)

      return {
        postId: postData.id,
        url: `https://facebook.com/${postData.id}`,
        success: true,
      }
    } else {
      const postRes = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token }),
      })

      const postData = await postRes.json()
      if (postData.error) throw new Error(postData.error.message)

      return {
        postId: postData.id,
        url: `https://facebook.com/${postData.id}`,
        success: true,
      }
    }
  } catch (err) {
    console.error('Facebook post failed:', err)
    throw err
  }
}

async function uploadPhotoToFacebook(
  photoUrl: string,
  pageId: string,
  token: string
): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: photoUrl,
      published: false,
      access_token: token,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Photo upload failed: ${data.error.message}`)
  return data.id
}

// -- Get page post insights (optional) ----------------------------------------

export async function getPostInsights(postId: string): Promise<{
  reach: number
  reactions: number
  comments: number
} | null> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) return null

  try {
    const res = await fetch(
      `${GRAPH_BASE}/${postId}?fields=reactions.summary(true),comments.summary(true)&access_token=${token}`
    )
    const data = await res.json()
    return {
      reach: 0,
      reactions: data.reactions?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
    }
  } catch {
    return null
  }
}
