import { cookies } from 'next/headers'
import { getIronSession, type IronSession } from 'iron-session'

export interface GithubSessionData {
  accessToken?: string
  oauthState?: string
  user?: {
    login: string
    name: string | null
    avatarUrl: string
  }
  repo?: {
    owner: string
    name: string
    fullName: string
    branch: string
  }
}

const sessionPassword = process.env.SESSION_SECRET

export const sessionOptions = {
  cookieName: 'md2slides_session',
  password: sessionPassword ?? '',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

export async function getSession(): Promise<IronSession<GithubSessionData>> {
  if (!sessionPassword || sessionPassword.length < 32) {
    throw new Error(
      'SESSION_SECRET env var is missing or too short (must be at least 32 characters). Set it in .env.local.'
    )
  }
  const cookieStore = await cookies()
  return getIronSession<GithubSessionData>(cookieStore, sessionOptions)
}
