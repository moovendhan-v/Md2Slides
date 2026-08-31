import { CALLOUT_CONFIG } from '@/lib/deck-spec'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const markdown = typeof body.markdown === 'string' ? body.markdown : ''

    if (!markdown.trim()) {
      return Response.json({
        valid: false,
        error: 'Markdown content cannot be empty',
        slidesCount: 0,
        diagnostics: [],
      }, { status: 400 })
    }

    const rawSlides: string[] = markdown.split(/\n---\n/).map((s: string) => s.trim()).filter(Boolean)
    const diagnostics: Array<{ slideIndex: number; level: 'info' | 'warning' | 'error'; message: string }> = []
    let calloutsCount = 0
    let imagesCount = 0
    let tablesCount = 0
    let diagramsCount = 0
    let codeBlocksCount = 0

    rawSlides.forEach((slide: string, idx: number) => {
      // Check title
      const hasTitle = /^#{1,3}\s+.+$/m.test(slide)
      if (!hasTitle) {
        diagnostics.push({
          slideIndex: idx + 1,
          level: 'warning',
          message: 'Slide has no headline (# Heading). Consider adding a title.',
        })
      }

      // Check callouts
      const calloutMatches = Array.from(slide.matchAll(/^:::(note|important|tip|warning|info|security|architecture|arch|caution|danger)(?:[|:\s\[{]+(?:style[:=])?([a-zA-Z]+)[\]}]*)?\s*$/gim))
      calloutsCount += calloutMatches.length
      calloutMatches.forEach((m: RegExpExecArray) => {
        const v = m[1]?.toLowerCase() ?? 'note'
        const validV = v in CALLOUT_CONFIG || v === 'arch' || v === 'caution' || v === 'danger'
        if (!validV) {
          diagnostics.push({
            slideIndex: idx + 1,
            level: 'warning',
            message: `Unknown callout variant ":::${m[1]}". Fallback to ":::note".`,
          })
        }
      })

      // Check images
      const imgMatches = Array.from(slide.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g))
      imagesCount += imgMatches.length

      // Check tables
      if (/\|.*\|.*\|/m.test(slide)) tablesCount++

      // Check diagrams
      if (/```mermaid/i.test(slide)) diagramsCount++

      // Check code
      if (/```[a-z]+/i.test(slide)) codeBlocksCount++
    })

    return Response.json({
      valid: true,
      slidesCount: rawSlides.length,
      stats: {
        calloutsCount,
        imagesCount,
        tablesCount,
        diagramsCount,
        codeBlocksCount,
      },
      diagnostics,
    })
  } catch (error) {
    return Response.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid request payload',
    }, { status: 500 })
  }
}
