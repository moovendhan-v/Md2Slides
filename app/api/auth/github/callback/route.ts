import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-session'
import { fetchGithubUser } from '@/lib/github-api'

function popupResponse(ok: boolean, error?: string) {
  const payload = JSON.stringify({ type: 'md2slides-github-auth', ok, error: error ?? null })
  const fallbackUrl = ok ? '/?github=connected' : `/?github_error=${encodeURIComponent(error ?? 'unknown')}`
  const html = `<!doctype html><html><body><script>
    if (window.opener) {
      window.opener.postMessage(${payload}, window.location.origin);
      window.close();
    } else {
      window.location.href = ${JSON.stringify(fallbackUrl)};
    }
  </script></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const session = await getSession()

  if (!code || !state || state !== session.oauthState) {
    return popupResponse(false, 'invalid_state')
  }
  session.oauthState = undefined

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return popupResponse(false, 'oauth_not_configured')
  }

  const redirectUri = new URL('/api/auth/github/callback', request.url).toString()
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  })

  if (!tokenRes.ok) {
    return popupResponse(false, 'token_exchange_failed')
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
  if (!tokenData.access_token) {
    return popupResponse(false, tokenData.error ?? 'unknown')
  }

  const user = await fetchGithubUser(tokenData.access_token)

  session.accessToken = tokenData.access_token
  session.user = { login: user.login, name: user.name, avatarUrl: user.avatar_url }
  await session.save()

  return popupResponse(true)
}
