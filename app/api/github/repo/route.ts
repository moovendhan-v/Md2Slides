import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/github-session'

export async function GET() {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  return NextResponse.json({ repo: session.repo ?? null })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const { owner, name, branch } = body ?? {}
  if (!owner || !name || !branch) {
    return NextResponse.json({ error: 'owner, name and branch are required' }, { status: 400 })
  }
  session.repo = { owner, name, fullName: `${owner}/${name}`, branch }
  await session.save()
  return NextResponse.json({ repo: session.repo })
}

export async function DELETE() {
  const session = await getSession()
  session.repo = undefined
  await session.save()
  return NextResponse.json({ ok: true })
}
