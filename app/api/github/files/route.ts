import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-session'
import { getFileContent, putFileContent, GithubApiError } from '@/lib/github-api'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const url = new URL(request.url)
  const owner = url.searchParams.get('owner')
  const repo = url.searchParams.get('repo')
  const contentPath = url.searchParams.get('contentPath')

  if (!owner || !repo || !contentPath) {
    return NextResponse.json({ error: 'owner, repo and contentPath are required' }, { status: 400 })
  }

  try {
    const file = await getFileContent(session.accessToken, owner, repo, contentPath)
    return NextResponse.json({ file })
  } catch (err) {
    const status = err instanceof GithubApiError ? err.status : 500
    return NextResponse.json({ error: 'Failed to read file from GitHub' }, { status })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const { owner, repo, path, content, message, sha } = body ?? {}
  if (!owner || !repo || !path || typeof content !== 'string') {
    return NextResponse.json({ error: 'owner, repo, path and content are required' }, { status: 400 })
  }
  try {
    const result = await putFileContent(
      session.accessToken,
      owner,
      repo,
      path,
      content,
      typeof message === 'string' && message ? message : `Update ${path} via Md2Slides`,
      typeof sha === 'string' ? sha : undefined
    )
    return NextResponse.json({ sha: result.sha })
  } catch (err) {
    const status = err instanceof GithubApiError ? err.status : 500
    return NextResponse.json({ error: 'Failed to save file to GitHub' }, { status })
  }
}
