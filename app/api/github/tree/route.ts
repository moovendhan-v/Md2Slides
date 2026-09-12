import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-session'
import { listAllMarkdownFiles, GithubApiError } from '@/lib/github-api'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const url = new URL(request.url)
  const owner = url.searchParams.get('owner')
  const repo = url.searchParams.get('repo')
  const branch = url.searchParams.get('branch')
  if (!owner || !repo || !branch) {
    return NextResponse.json({ error: 'owner, repo and branch are required' }, { status: 400 })
  }
  try {
    const files = await listAllMarkdownFiles(session.accessToken, owner, repo, branch)
    return NextResponse.json({ files })
  } catch (err) {
    const status = err instanceof GithubApiError ? err.status : 500
    return NextResponse.json({ error: 'Failed to list files' }, { status })
  }
}
