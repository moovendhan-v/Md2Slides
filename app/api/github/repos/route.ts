import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-session'
import { listRepos, createRepo, GithubApiError } from '@/lib/github-api'

export async function GET() {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  try {
    const repos = await listRepos(session.accessToken)
    return NextResponse.json({ repos })
  } catch (err) {
    const status = err instanceof GithubApiError ? err.status : 500
    return NextResponse.json({ error: 'Failed to list repositories' }, { status })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Repository name is required' }, { status: 400 })
  }
  try {
    const repo = await createRepo(session.accessToken, name, Boolean(body?.private))
    return NextResponse.json({ repo })
  } catch (err) {
    const status = err instanceof GithubApiError ? err.status : 500
    return NextResponse.json({ error: 'Failed to create repository' }, { status })
  }
}
