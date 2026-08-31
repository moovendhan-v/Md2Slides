import { SLIDE_TEMPLATES_SPEC } from '@/lib/deck-spec'

export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = Array.from(new Set(SLIDE_TEMPLATES_SPEC.map((t) => t.category)))
  return Response.json({
    total: SLIDE_TEMPLATES_SPEC.length,
    categories,
    templates: SLIDE_TEMPLATES_SPEC,
  })
}
