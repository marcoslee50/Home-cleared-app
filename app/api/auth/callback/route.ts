import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/calendar'

// Handles the Google OAuth callback during initial setup. After first auth,
// the refresh token is stored as a Vercel env var and this route is unused.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#0A0F0D;color:#E8F0EB;"><h2>❌ OAuth Error</h2><p>${error}</p><p>Go back and try again.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!code) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#0A0F0D;color:#E8F0EB;"><h2>⚠️ No code received</h2><p>OAuth flow incomplete.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const tokens = await getTokensFromCode(code)

    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#0A0F0D;color:#E8F0EB;max-width:600px;">
        <h2 style="color:#2DAA6B;">✅ Google Auth Successful</h2>
        <p>Copy your <strong>refresh token</strong> and add it to Vercel as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
        <div style="background:#111A14;border:1px solid #1C2E21;border-radius:8px;padding:1rem;margin:1rem 0;word-break:break-all;">
          <code style="color:#4B8FD4;">${tokens.refresh_token || 'No refresh token returned — try revoking app access in Google and retrying'}</code>
        </div>
        <p style="color:#8FAD96;">Also available:</p>
        <ul style="color:#8FAD96;">
          <li>Access token expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'unknown'}</li>
          <li>Scopes: ${tokens.scope}</li>
        </ul>
        <p style="color:#D4A017;">⚠️ Do NOT share this token. Add it to Vercel Environment Variables immediately.</p>
        <hr style="border-color:#1C2E21;margin:1.5rem 0;">
        <p>Once saved to Vercel, <a href="/dashboard" style="color:#2DAA6B;">go to your dashboard →</a></p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#0A0F0D;color:#E8F0EB;"><h2>❌ Token Exchange Failed</h2><pre style="color:#C0392B;">${String(err)}</pre></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
