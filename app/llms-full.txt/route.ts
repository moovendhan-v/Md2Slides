import { generateLLMsFullTxt } from '@/lib/deck-spec'

export const dynamic = 'force-dynamic'

export async function GET() {
  const content = generateLLMsFullTxt()
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
