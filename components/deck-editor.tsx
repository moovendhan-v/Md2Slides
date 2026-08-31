'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {
  Archive, CheckSquare, ChevronLeft, ChevronRight, Code2, Download,
  FileText, FolderOpen, ImageIcon, LayoutTemplate, Menu, MessageSquare,
  MonitorPlay, Moon, Network, PanelLeft, Pencil, Plus, Presentation,
  Search, Sun, Table2, Type, X, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

// ─── Types ────────────────────────────────────────────────────────────────────
type Slide = { id: string; title: string; body: string; accent: string; raw: string }
type Theme = 'light' | 'dark'
type Store = {
  markdown: string
  active: number
  theme: Theme
  setMarkdown: (v: string) => void
  setActive: (v: number) => void
  setTheme: (v: Theme) => void
  addSlide: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const accents = ['bg-primary', 'bg-chart-2', 'bg-chart-4', 'bg-chart-5']

const initialMarkdown = [
  '# The future of work',
  '',
  'How modern teams create, collaborate, and ship better.',
  '',
  '---',
  '',
  '## Highlights',
  '',
  'What moved the business forward this quarter?',
  '',
  '| Feature   | Status      |',
  '| --------- | ----------- |',
  '| Fast      | ✅ Ready     |',
  '| Reliable  | 🔄 In progress |',
  '| Secure    | ✅ Complete  |',
  '',
  '---',
  '',
  '## Make space for the work',
  '',
  '> Great work needs room to happen.',
  '',
  '- Clear context, fewer meetings',
  '- Small teams, high ownership',
  '- Momentum over perfection',
  '',
  '---',
  '',
  '## Remote Images',
  '',
  '![Dashboard analytics](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900)',
  '',
  'Remote images now render inline inside slides.',
  '',
  '---',
  '',
  '## Code + Tables',
  '',
  '```ts',
  'const deck = createDeck({ title: "Modern Presentation" })',
  '```',
  '',
  '| Component | GFM support |',
  '|-----------|-------------|',
  '| Tables    | ✅ |',
  '| Images    | ✅ |',
  '| Code      | ✅ |',
].join('\n')

// ─── Slide parser ─────────────────────────────────────────────────────────────
// Splits on `---` lines that are NOT inside a fenced code block.
const parseSlides = (md: string): Slide[] => {
  const rawSlides: string[] = []
  let current = ''
  let inFence = false

  for (const line of md.split('\n')) {
    if (/^```/.test(line.trim())) inFence = !inFence
    if (!inFence && line.trim() === '---') {
      if (current.trim()) rawSlides.push(current.trim())
      current = ''
    } else {
      current += line + '\n'
    }
  }
  if (current.trim()) rawSlides.push(current.trim())
  if (!rawSlides.length && md.trim()) rawSlides.push(md.trim())

  return rawSlides.map((raw, i) => {
    const titleMatch = raw.match(/^#{1,3}\s+(.+)$/m)
    const title = titleMatch?.[1] ?? `Untitled slide ${i + 1}`
    const body = raw.replace(/^#{1,3}\s+.+$/m, '').trim()
    return { id: `slide-${i}`, title, body, accent: accents[i % accents.length], raw }
  })
}

// ─── Zustand store ────────────────────────────────────────────────────────────
const useDeckStore = create<Store>()(
  persist(
    (set) => ({
      markdown: initialMarkdown,
      active: 0,
      theme: 'dark',
      setMarkdown: (markdown) => set({ markdown }),
      setActive: (active) => set({ active }),
      setTheme: (theme) => set({ theme }),
      addSlide: () =>
        set((s) => ({
          markdown: `${s.markdown}\n\n---\n\n## New slide\n\nStart writing here...`,
        })),
    }),
    { name: 'deckrun-editor-v3' },
  ),
)

// ─── Shared Markdown component ────────────────────────────────────────────────
// All three render surfaces (preview card, presentation card, filmstrip) use this.
function SlideMarkdown({ body, className = '' }: { body: string; className?: string }) {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // Paragraphs
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        // Headings (sub-headings inside a slide body)
        h1: ({ children }) => <h1 className="mb-3 text-xl font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
        // Lists
        ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-4 border-primary pl-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // Inline code
        code: ({ children, className: cls }) => {
          const isBlock = cls?.includes('language-')
          return isBlock ? (
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm leading-6 overflow-x-auto whitespace-pre">
              {children}
            </code>
          ) : (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
          )
        },
        pre: ({ children }) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
        // Tables (GFM)
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-border/50">{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-muted-foreground">{children}</td>
        ),
        // Images — render inline with max constraints so they fit the slide
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ''}
            className="my-3 max-h-52 max-w-full rounded-md object-contain"
            loading="lazy"
          />
        ),
        // Horizontal rule (not a slide break — those are stripped before this point)
        hr: () => <hr className="my-3 border-border" />,
        // Strong / em
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        // Links
        a: ({ href, children }) => (
          <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
    </div>
  )
}

// ─── Inserts / templates data ─────────────────────────────────────────────────
const inserts = [
  ['Note callout',        'Informational highlight block', MessageSquare, '> **Note:** Add useful context here.'],
  ['Important notice',    'High-priority essential info',  Zap,           '> **Important:** Add essential information.'],
  ['Bullet list',         'Scannable list',                Type,          '- First point\n- Second point\n- Third point'],
  ['Checklist',           'Tasks and outcomes',            CheckSquare,   '- [ ] First task\n- [x] Completed task'],
  ['Table',               'Structured comparison',         Table2,        '| Feature | Status |\n| --- | --- |\n| Fast | ✅ Ready |\n| Reliable | 🔄 In progress |'],
  ['Mermaid diagram',     'Flow and systems diagram',      Network,       '```mermaid\ngraph TD\n  Client --> API\n  API --> Database\n```'],
  ['Image',               'Image with alt text',           ImageIcon,     '![Describe image](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900)'],
  ['Code block',          'Syntax-highlighted snippet',    Code2,         '```ts\nconst deck = await createDeck()\n```'],
] as const

const layouts = [
  'ImageCard3Flex','ImageCard4Flex','TitleAndBody','SplitFeature','QuoteFocus',
  'Metrics3','Metrics4','Comparison','Timeline','Roadmap','Architecture','TeamGrid',
  'Gallery3','Gallery4','ProblemSolution','BeforeAfter','Process3','Process4',
  'Agenda','SectionBreak','Closing','Statement','CodeWalkthrough','DataTable',
  'ChecklistBoard','CaseStudy','LogoWall','BigNumber','TwoColumn','FullBleedImage',
]
const templates = layouts.map((name, i) => ({
  name,
  description: `${name.replace(/([A-Z])/g, ' $1').trim()} layout for polished presentations.`,
  accent: accents[i % accents.length],
  markdown: `# ${name}\n\nA reusable ${name} composition for your next story.\n\n---\n\n## Build the narrative\n\n- Clear hierarchy\n- Focused content\n- Ready to customize`,
}))

const insertAt = (value: string, pos: number, snippet: string) =>
  `${value.slice(0, pos)}${snippet}${value.slice(pos)}`

// ─── Small helpers ────────────────────────────────────────────────────────────
function IconButton({
  label, children, onClick,
}: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick}>
      {children}
    </Button>
  )
}

function DrawingLayer({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || !enabled) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const resize = () => {
      c.width = c.clientWidth * devicePixelRatio
      c.height = c.clientHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    let drawing = false
    const pt = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const down = (e: PointerEvent) => { drawing = true; const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y) }
    const move = (e: PointerEvent) => {
      if (!drawing) return
      const [x, y] = pt(e)
      ctx.lineTo(x, y); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
    }
    const up = () => { drawing = false }
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up)
    return () => {
      c.removeEventListener('pointerdown', down)
      c.removeEventListener('pointermove', move)
      c.removeEventListener('pointerup', up)
    }
  }, [enabled])
  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 h-full w-full ${enabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden="true"
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DeckEditor() {
  const { markdown, active, theme, setMarkdown, setActive, setTheme, addSlide } = useDeckStore()
  const slides = useMemo(() => parseSlides(markdown), [markdown])
  const current = slides[Math.min(active, slides.length - 1)] ?? slides[0]

  const [sidebar, setSidebar] = useState(true)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [slash, setSlash] = useState(false)
  const [sourceMode, setSourceMode] = useState<'slide' | 'deck'>('deck')
  const [presenting, setPresenting] = useState(false)
  const [laser, setLaser] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [transition, setTransition] = useState('Fade')
  const [cursor, setCursor] = useState({ x: 50, y: 50 })
  const [exported, setExported] = useState('')

  const editor = useRef<HTMLTextAreaElement>(null)

  // The text shown in the editor depends on mode
  // In slide mode we extract just the current slide's raw text
  const slideRaws = useMemo(() => {
    const parts: string[] = []
    let current = ''
    let inFence = false
    for (const line of markdown.split('\n')) {
      if (/^```/.test(line.trim())) inFence = !inFence
      if (!inFence && line.trim() === '---') {
        if (current.trim()) parts.push(current.trim())
        current = ''
      } else {
        current += line + '\n'
      }
    }
    if (current.trim()) parts.push(current.trim())
    return parts
  }, [markdown])

  const editorValue = sourceMode === 'slide' ? (slideRaws[active] ?? '') : markdown

  // When editing in slide-only mode, splice the change back into the full deck
  const handleEditorChange = (value: string) => {
    if (sourceMode === 'deck') {
      setMarkdown(value)
    } else {
      // Replace the active slide's raw block inside the full markdown
      const updated = [...slideRaws]
      updated[active] = value
      setMarkdown(updated.join('\n\n---\n\n'))
    }
  }

  // Apply / remove dark class on <html>
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') html.classList.add('dark')
    else html.classList.remove('dark')
  }, [theme])

  const filtered = inserts.filter(([label, detail]) =>
    `${label} ${detail}`.toLowerCase().includes(''),
  )

  const notify = (x: string) => {
    setExported(`${x} export prepared`)
    window.setTimeout(() => setExported(''), 2200)
  }

  const insert = (snippet: string) => {
    const el = editor.current
    if (sourceMode === 'slide') {
      // Insert into slide-only buffer then sync
      const base = slideRaws[active] ?? ''
      const pos = el?.selectionStart ?? base.length
      const next = insertAt(base, pos, snippet)
      handleEditorChange(next)
    } else {
      const pos = el?.selectionStart ?? markdown.length
      setMarkdown(insertAt(markdown, pos, snippet))
    }
    setSlash(false)
    requestAnimationFrame(() => {
      el?.focus()
    })
  }

  // Keyboard shortcuts in presentation mode
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!presenting) return
      if (e.key === 'ArrowRight') setActive(Math.min(active + 1, slides.length - 1))
      if (e.key === 'ArrowLeft') setActive(Math.max(active - 1, 0))
      if (e.key === 'Escape') setPresenting(false)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [presenting, active, slides.length, setActive])

  // ── Presentation mode ────────────────────────────────────────────────────
  if (presenting) {
    return (
      <div className="flex min-h-screen flex-col bg-foreground text-background">
        <header className="flex items-center justify-between border-b border-background/15 px-5 py-3">
          <span className="font-mono text-sm">DECKRUN / PRESENTATION</span>
          <div className="flex items-center gap-2">
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              className="rounded-md border border-background/20 bg-transparent px-2 py-1 text-sm"
            >
              <option>Fade</option>
              <option>Slide</option>
              <option>None</option>
            </select>
            <Button variant={laser ? 'secondary' : 'ghost'} size="sm" onClick={() => setLaser(!laser)}>
              <Zap data-icon="inline-start" />Laser
            </Button>
            <Button variant={drawing ? 'secondary' : 'ghost'} size="sm" onClick={() => setDrawing(!drawing)}>
              <Pencil data-icon="inline-start" />Draw
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPresenting(false)}>
              <X data-icon="inline-start" />Exit
            </Button>
          </div>
        </header>

        <main
          className="relative flex flex-1 items-center justify-center p-5"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setCursor({ x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 })
          }}
        >
          <Card
            className={`relative flex aspect-video w-full max-w-5xl flex-col overflow-hidden bg-background text-foreground transition-all duration-500 ${transition === 'Slide' ? 'animate-in slide-in-from-right-4' : ''}`}
          >
            <CardHeader className="shrink-0 p-8 md:p-16">
              <div className={`mb-7 h-1.5 w-20 rounded-full ${current.accent}`} />
              <Badge variant="secondary" className="mb-5 w-fit">
                SLIDE {String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </Badge>
              <CardTitle className="text-4xl tracking-tight md:text-6xl">{current.title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto px-8 pb-12 md:px-16">
              <SlideMarkdown body={current.body} className="text-base text-muted-foreground md:text-xl" />
            </CardContent>
            <DrawingLayer enabled={drawing} />
          </Card>

          {laser && (
            <div
              className="pointer-events-none absolute size-4 rounded-full bg-destructive shadow-[0_0_20px_8px] shadow-destructive"
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
            />
          )}

          <div className="absolute bottom-5 flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => setActive(Math.max(active - 1, 0))}>
              <ChevronLeft />
            </Button>
            <span className="rounded-md bg-background/10 px-3 py-2 text-sm">
              {active + 1} / {slides.length}
            </span>
            <Button variant="secondary" size="icon" onClick={() => setActive(Math.min(active + 1, slides.length - 1))}>
              <ChevronRight />
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // ── Editor mode ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 md:px-5">
        <div className="flex items-center gap-3">
          <IconButton label="Toggle navigation" onClick={() => setSidebar(!sidebar)}>
            <Menu />
          </IconButton>
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Presentation className="size-4" />
            </div>
            Deckrun
          </div>
          <Separator orientation="vertical" className="h-5" />
          <span className="hidden text-sm text-muted-foreground sm:inline">Quarterly review</span>
          <Badge variant="secondary">Draft</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Light / dark toggle */}
          <IconButton
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
          <Button variant="outline" size="sm" onClick={() => notify('PDF')}>
            <Download data-icon="inline-start" />Export
          </Button>
          <Button size="sm" onClick={() => setPresenting(true)}>
            <MonitorPlay data-icon="inline-start" />Present
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        {sidebar && (
          <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/20 md:flex">
            <nav className="flex flex-col gap-1 p-3">
              <Button variant="secondary" className="justify-start">
                <FileText data-icon="inline-start" />Editor
              </Button>
              <Button variant="ghost" className="justify-start">
                <FolderOpen data-icon="inline-start" />My decks
                <Badge className="ml-auto" variant="outline">4</Badge>
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setTemplatesOpen(true)}>
                <LayoutTemplate data-icon="inline-start" />Templates
                <Badge className="ml-auto" variant="outline">30</Badge>
              </Button>
              <Button variant="ghost" className="justify-start">
                <Archive data-icon="inline-start" />Archive
              </Button>
            </nav>
            <Separator />
            <div className="flex flex-col gap-3 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My decks</span>
              {['Quarterly review', 'Product launch', 'Team strategy'].map((x, i) => (
                <button
                  key={x}
                  onClick={() => i === 0 && setMarkdown(initialMarkdown)}
                  className="rounded-md p-2 text-left text-sm hover:bg-muted"
                >
                  <p className="font-medium">{x}</p>
                  <p className="text-xs text-muted-foreground">{i + 2} slides · saved locally</p>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main editing area */}
        <main className="flex min-w-0 flex-1 flex-col">

          {/* Toolbar */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconButton label="Toggle sidebar" onClick={() => setSidebar(!sidebar)}>
                <PanelLeft />
              </IconButton>
              <span>Slide {active + 1} of {slides.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={sourceMode === 'slide' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSourceMode(sourceMode === 'slide' ? 'deck' : 'slide')}
              >
                Current slide only
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen(true)}>
                <LayoutTemplate data-icon="inline-start" />Templates
              </Button>
            </div>
          </div>

          {/* Editor + Preview pane */}
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">

            {/* ── Editor ── */}
            <section className="relative flex min-h-[380px] flex-1 flex-col border-b xl:border-b-0 xl:border-r">
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Code2 className="size-3.5" />
                  Markdown
                  <Badge variant="outline">{sourceMode === 'slide' ? 'CURRENT SLIDE' : 'FULL DECK'}</Badge>
                </span>
                <IconButton label="Search"><Search /></IconButton>
              </div>
              <Textarea
                ref={editor}
                value={editorValue}
                onChange={(e) => {
                  handleEditorChange(e.target.value)
                  const word = e.target.value.slice(0, e.target.selectionStart).split(/\s/).at(-1)
                  setSlash(word === '/')
                }}
                onKeyDown={(e) => {
                  if (e.key === '/' || e.key === 'ArrowDown' || e.key === 'ArrowUp') setSlash(true)
                  if (e.key === 'Escape') setSlash(false)
                  if (e.key === 'Enter' && slash) { e.preventDefault(); insert(filtered[0][3]) }
                }}
                className="min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-background p-5 font-mono text-sm leading-7 focus-visible:ring-0"
                spellCheck={false}
              />

              {/* Quick insert menu */}
              {slash && (
                <div className="absolute left-5 right-5 top-16 z-30 max-h-96 overflow-auto rounded-lg border bg-popover p-2 shadow-2xl">
                  <div className="flex items-center justify-between border-b px-3 pb-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <Zap className="size-4 text-primary" />Quick Insert
                    </span>
                    <Badge variant="secondary">ESC to close</Badge>
                  </div>
                  {filtered.map(([label, detail, I, code]) => (
                    <button
                      key={label}
                      onClick={() => insert(code)}
                      className="flex w-full items-center gap-3 rounded-md p-3 text-left hover:bg-accent"
                    >
                      <span className="flex size-9 items-center justify-center rounded-md border bg-muted">
                        <I className="size-4" />
                      </span>
                      <span className="flex-1">
                        <strong className="block text-sm">{label}</strong>
                        <small className="text-muted-foreground">{detail}</small>
                      </span>
                      <kbd className="text-xs text-muted-foreground">Enter</kbd>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── Live Preview ── */}
            <section className="flex min-h-[380px] flex-1 flex-col bg-muted/20">
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">Live preview</span>
                <Badge variant="outline">AUTO-SAVED</Badge>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
                <Card className="flex aspect-video w-full max-w-2xl shrink-0 flex-col overflow-hidden">
                  <CardHeader className="shrink-0 p-8 md:p-12">
                    <div className={`mb-5 h-1.5 w-16 rounded-full ${current.accent}`} />
                    <Badge variant="secondary" className="mb-4 w-fit">
                      SLIDE {String(active + 1).padStart(2, '0')}
                    </Badge>
                    <CardTitle className="text-2xl md:text-4xl">{current.title}</CardTitle>
                  </CardHeader>
                  {/* Scrollable body with real Markdown rendering */}
                  <CardContent className="overflow-y-auto px-8 pb-8 md:px-12">
                    <SlideMarkdown body={current.body} className="text-sm text-muted-foreground md:text-base" />
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>

          {/* ── Filmstrip ── */}
          <div className="flex min-h-28 shrink-0 gap-3 overflow-x-auto border-t p-4">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`w-40 shrink-0 text-left ${i === active ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
              >
                <div
                  className={`relative aspect-video overflow-hidden rounded-md border-2 bg-card p-3 ${i === active ? 'border-primary' : 'border-transparent'}`}
                >
                  <div className={`absolute left-0 top-0 h-1 w-full ${s.accent}`} />
                  <p className="line-clamp-1 text-[10px] font-semibold">{s.title}</p>
                  {/* Mini markdown preview in thumbnail */}
                  <div className="pointer-events-none mt-1 scale-[0.55] origin-top-left text-[8px] leading-tight text-muted-foreground line-clamp-3 overflow-hidden">
                    <SlideMarkdown body={s.body} />
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {String(i + 1).padStart(2, '0')} · {i === active ? 'Selected' : 'Slide'}
                </span>
              </button>
            ))}
            <button
              onClick={addSlide}
              className="flex aspect-video w-40 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted"
            >
              <Plus />
            </button>
          </div>
        </main>
      </div>

      {/* Templates modal */}
      {templatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg border bg-background p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Template library</h2>
                <p className="text-sm text-muted-foreground">30 composable layouts. Click one to load it into your deck.</p>
              </div>
              <IconButton label="Close templates" onClick={() => setTemplatesOpen(false)}><X /></IconButton>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setMarkdown(t.markdown); setTemplatesOpen(false) }}
                  className="overflow-hidden rounded-lg border text-left transition hover:border-primary hover:shadow-md"
                >
                  <div className={`flex h-24 items-end justify-between p-4 text-primary-foreground ${t.accent}`}>
                    <LayoutTemplate />
                    <span className="font-mono text-xs">{t.name}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export toast */}
      {exported && (
        <div className="fixed bottom-5 right-5 rounded-md border bg-background px-4 py-3 text-sm font-medium shadow-lg">
          {exported}
        </div>
      )}
    </div>
  )
}

export { useDeckStore }
