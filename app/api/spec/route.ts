import {
  CALLOUT_CONFIG,
  CALLOUT_STYLES,
  IMAGE_SYNTAX_SPEC,
  RATIO_PRESETS_SPEC,
  SLIDE_TEMPLATES_SPEC,
} from '@/lib/deck-spec'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    engine: 'Md2Slide',
    version: '2.0.0',
    specVersion: '1.0',
    calloutVariants: CALLOUT_CONFIG,
    calloutStyles: CALLOUT_STYLES,
    imageFormatting: IMAGE_SYNTAX_SPEC,
    aspectRatios: RATIO_PRESETS_SPEC,
    templatesCount: SLIDE_TEMPLATES_SPEC.length,
    endpoints: {
      llmsTxt: '/llms.txt',
      llmsFullTxt: '/llms-full.txt',
      templates: '/api/templates',
      generateDeck: '/api/generate-deck',
      validateDeck: '/api/validate-deck',
    },
  })
}
