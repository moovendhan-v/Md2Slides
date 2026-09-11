import { generateDeck } from '@/lib/generate-deck'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = generateDeck(body)
    return Response.json(result)
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request payload',
    }, { status: 500 })
  }
}
