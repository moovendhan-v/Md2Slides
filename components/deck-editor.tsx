'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {
  Archive, AlertTriangle, CheckSquare, ChevronLeft, ChevronRight, Code2,
  Download, FileText, FolderOpen, ImageIcon, Info, LayoutTemplate, Lightbulb,
  Menu, MessageSquare, MonitorPlay, Moon, Network, PanelLeft, Pencil, Plus,
  Presentation, Search, Sun, Table2, Type, X, Zap, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Minus, ChevronDown, Shield, Check, Sparkles,
  Layers, Sliders, Palette, RefreshCw, Copy, CheckCheck, Bot, ExternalLink,
  Eye, FileCode, Terminal
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  CALLOUT_CONFIG,
  CALLOUT_STYLES,
  SLIDE_TEMPLATES_SPEC as SLIDE_TEMPLATES,
  generateLLMsTxt,
} from '@/lib/deck-spec'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Slide = { id: string; title: string; body: string; accent: string; raw: string }
export type Theme = 'light' | 'dark'
export type RatioKey = '16:9' | '16:10' | '4:3' | '1:1' | '9:16' | '3:4' | 'A4'
export type CalloutVariant = 'note' | 'important' | 'tip' | 'warning' | 'info' | 'security' | 'architecture'
export type CalloutStyle = 'enterprise' | 'modern' | 'accent' | 'glass'
export type ElementType = 'image' | 'text' | 'heading' | 'list' | 'table' | 'code' | 'callout' | null
export type ImgFit = 'contain' | 'cover' | 'fill'
export type ImgAlign = 'left' | 'center' | 'right'
export type ImgRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

export interface ImageAttributes {
  alt: string
  src: string
  fit: ImgFit
  maxH: number
  align: ImgAlign
  width: string
  radius: ImgRadius
  shadow: boolean
  rawAlt: string
}

export interface SelectedElement {
  type: ElementType
  src?: string
  alt?: string
  rawAlt?: string
  imgFit?: ImgFit
  imgMaxH?: number
  imgAlign?: ImgAlign
  imgWidth?: string
  imgRadius?: ImgRadius
  imgShadow?: boolean
  calloutVariant?: CalloutVariant
  calloutStyle?: CalloutStyle
  calloutContent?: string
  calloutRawDirective?: string
  fontSize?: number
  fontWeight?: number
  align?: 'left' | 'center' | 'right'
}

interface RatioPreset {
  key: RatioKey
  label: string
  ratio: string
  badge: string
  orientation: 'landscape' | 'portrait' | 'square'
  note: string
}

type Store = {
  markdown: string
  active: number
  theme: Theme
  ratio: RatioKey
  fontScale: number
  calloutStyle: CalloutStyle
  setMarkdown: (v: string) => void
  setActive: (v: number) => void
  setTheme: (v: Theme) => void
  setRatio: (v: RatioKey) => void
  setFontScale: (v: number) => void
  setCalloutStyle: (v: CalloutStyle) => void
  addSlide: (body: string) => void
}

// ─── Ratio presets ─────────────────────────────────────────────────────────
const RATIOS: RatioPreset[] = [
  { key: '16:9',  label: '16 : 9',  ratio: '16/9',   badge: 'Widescreen', orientation: 'landscape', note: 'Standard HD / 4K' },
  { key: '16:10', label: '16 : 10', ratio: '16/10',  badge: 'Widescreen', orientation: 'landscape', note: 'MacBook & laptops' },
  { key: '4:3',   label: '4 : 3',   ratio: '4/3',    badge: 'Classic',    orientation: 'landscape', note: 'Legacy projectors' },
  { key: '1:1',   label: '1 : 1',   ratio: '1/1',    badge: 'Square',     orientation: 'square',    note: 'Social media' },
  { key: '9:16',  label: '9 : 16',  ratio: '9/16',   badge: 'Portrait',   orientation: 'portrait',  note: 'Mobile stories' },
  { key: '3:4',   label: '3 : 4',   ratio: '3/4',    badge: 'Portrait',   orientation: 'portrait',  note: 'Tablet / print' },
]

// ─── Image Markdown Parser & Formatter ───────────────────────────────────────
export function parseImageParams(rawAlt: string, src: string): ImageAttributes {
  let alt = rawAlt || ''
  let fit: ImgFit = 'contain'
  let maxH = 320
  let align: ImgAlign = 'center'
  let width = '100%'
  let radius: ImgRadius = 'md'
  let shadow = false

  if (rawAlt.includes('|')) {
    const parts = rawAlt.split('|').map(s => s.trim())
    alt = parts[0]
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].toLowerCase()
      if (p.startsWith('fit:')) {
        const val = p.replace('fit:', '')
        if (val === 'cover' || val === 'contain' || val === 'fill') fit = val
      } else if (p === 'cover' || p === 'contain' || p === 'fill') {
        fit = p
      } else if (p.startsWith('maxh:')) {
        const num = parseInt(p.replace('maxh:', '').replace('px', ''), 10)
        if (!isNaN(num)) maxH = num
      } else if (/^\d+(px)?$/.test(p)) {
        const num = parseInt(p.replace('px', ''), 10)
        if (!isNaN(num)) maxH = num
      } else if (p.startsWith('align:')) {
        const val = p.replace('align:', '')
        if (val === 'left' || val === 'center' || val === 'right') align = val
      } else if (p === 'left' || p === 'center' || p === 'right') {
        align = p
      } else if (p.startsWith('w:') || p.startsWith('width:')) {
        width = p.replace(/^(w|width):/, '')
      } else if (p.startsWith('radius:')) {
        const val = p.replace('radius:', '')
        if (['none', 'sm', 'md', 'lg', 'full'].includes(val)) radius = val as ImgRadius
      } else if (p === 'shadow' || p === 'shadow:true') {
        shadow = true
      }
    }
  }

  // Also support URL query params e.g. #fit=cover&maxH=320&align=center
  try {
    if (src && src.includes('#')) {
      const hash = src.split('#')[1]
      const params = new URLSearchParams(hash)
      if (params.get('fit')) fit = params.get('fit') as ImgFit
      if (params.get('maxH')) maxH = parseInt(params.get('maxH')!, 10) || maxH
      if (params.get('align')) align = params.get('align') as ImgAlign
      if (params.get('w')) width = params.get('w')!
      if (params.get('radius')) radius = params.get('radius') as ImgRadius
      if (params.get('shadow')) shadow = params.get('shadow') === 'true'
    }
  } catch {
    // Ignore URL parse error
  }

  return { alt, src, fit, maxH, align, width, radius, shadow, rawAlt }
}

export function formatImageMarkdown(img: ImageAttributes): string {
  const parts = [img.alt || 'Image']
  if (img.fit !== 'contain') parts.push(`fit:${img.fit}`)
  if (img.maxH !== 320) parts.push(`maxH:${img.maxH}`)
  if (img.align !== 'center') parts.push(`align:${img.align}`)
  if (img.width && img.width !== '100%') parts.push(`w:${img.width}`)
  if (img.radius && img.radius !== 'md') parts.push(`radius:${img.radius}`)
  if (img.shadow) parts.push('shadow:true')

  const formattedAlt = parts.length > 1 ? parts.join('|') : parts[0]
  return `![${formattedAlt}](${img.src})`
}

// ─── Callout Parser & Preprocessor ───────────────────────────────────────────
export interface CalloutBlock {
  variant: CalloutVariant
  content: string
  style?: CalloutStyle
  rawDirective?: string
}

export function parseSlideSegments(body: string): Array<{ type: 'callout'; data: CalloutBlock } | { type: 'markdown'; data: string }> {
  const segments: Array<{ type: 'callout'; data: CalloutBlock } | { type: 'markdown'; data: string }> = []
  const lines = body.split('\n')
  let i = 0
  let mdBuffer = ''

  while (i < lines.length) {
    const line = lines[i]

    // 1. Check container directive: :::note, :::note|style:modern, :::important[style=accent], etc.
    const directiveMatch = line.match(/^:::(note|important|tip|warning|info|security|architecture|arch|caution|danger)(?:[|:\s\[{]+(?:style[:=])?([a-zA-Z]+)[\]}]*)?\s*$/i)
    if (directiveMatch) {
      if (mdBuffer.trim()) { segments.push({ type: 'markdown', data: mdBuffer }); mdBuffer = '' }
      let rawVariant = directiveMatch[1].toLowerCase()
      if (rawVariant === 'arch') rawVariant = 'architecture'
      if (rawVariant === 'caution' || rawVariant === 'danger') rawVariant = 'warning'
      const variant = (rawVariant in CALLOUT_CONFIG ? rawVariant : 'note') as CalloutVariant

      let explicitStyle: CalloutStyle | undefined = undefined
      if (directiveMatch[2]) {
        const s = directiveMatch[2].toLowerCase()
        if (['enterprise', 'modern', 'accent', 'glass'].includes(s)) {
          explicitStyle = s as CalloutStyle
        }
      }

      const contentLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        contentLines.push(lines[i])
        i++
      }
      segments.push({
        type: 'callout',
        data: {
          variant,
          content: contentLines.join('\n'),
          style: explicitStyle,
          rawDirective: line.trim(),
        },
      })
      i++
      continue
    }

    // 2. Check GitHub Alert syntax: > [!NOTE], > [!IMPORTANT], > [!WARNING|style:modern], etc.
    const ghAlertMatch = line.match(/^>\s*\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION|INFO|SECURITY)(?:[|:\s]+(?:style[:=])?([a-zA-Z]+))?\]\s*$/i)
    if (ghAlertMatch) {
      if (mdBuffer.trim()) { segments.push({ type: 'markdown', data: mdBuffer }); mdBuffer = '' }
      let key = ghAlertMatch[1].toLowerCase()
      if (key === 'caution') key = 'warning'
      const variant = (key in CALLOUT_CONFIG ? key : 'note') as CalloutVariant

      let explicitStyle: CalloutStyle | undefined = undefined
      if (ghAlertMatch[2]) {
        const s = ghAlertMatch[2].toLowerCase()
        if (['enterprise', 'modern', 'accent', 'glass'].includes(s)) {
          explicitStyle = s as CalloutStyle
        }
      }

      const contentLines: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        contentLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      segments.push({
        type: 'callout',
        data: {
          variant,
          content: contentLines.join('\n'),
          style: explicitStyle,
          rawDirective: line.trim(),
        },
      })
      continue
    }

    // 3. Check Blockquote prefix with bold keyword: > **Important:** or > **Note:** or > Important: or /> Important:
    const bqKeywordMatch = line.match(/^(?:>|\/>)\s*(?:\*\*)?(Note|Important|Warning|Tip|Caution|Info|Security|Architecture):(?:\*\*)?\s*(.*)$/i)
    if (bqKeywordMatch) {
      if (mdBuffer.trim()) { segments.push({ type: 'markdown', data: mdBuffer }); mdBuffer = '' }
      let key = bqKeywordMatch[1].toLowerCase()
      if (key === 'caution') key = 'warning'
      const variant = (key in CALLOUT_CONFIG ? key : 'note') as CalloutVariant
      const contentLines: string[] = []
      if (bqKeywordMatch[2]) contentLines.push(bqKeywordMatch[2])
      i++
      while (i < lines.length && (lines[i].startsWith('>') || lines[i].startsWith('/>'))) {
        contentLines.push(lines[i].replace(/^(?:>|\/>)\s?/, ''))
        i++
      }
      segments.push({
        type: 'callout',
        data: {
          variant,
          content: contentLines.join('\n'),
          rawDirective: line.trim(),
        },
      })
      continue
    }

    mdBuffer += line + '\n'
    i++
  }

  if (mdBuffer.trim()) segments.push({ type: 'markdown', data: mdBuffer })
  return segments
}

// ─── Markdown Syntax Color Coder ───────────────────────────────────────────────
export function ColorCodedMarkdown({
  markdown,
  className = '',
}: {
  markdown: string
  className?: string
}) {
  const lines = useMemo(() => markdown.split('\n'), [markdown])

  return (
    <div className={`font-mono text-xs md:text-sm leading-relaxed select-text overflow-y-auto p-5 space-y-1 bg-zinc-950 text-zinc-100 ${className}`}>
      {lines.map((line, i) => {
        // 1. Slide Boundary (---)
        if (line.trim() === '---') {
          return (
            <div key={i} className="my-3 flex items-center gap-2 py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">
              <span className="text-[10px] tracking-widest uppercase font-mono">─── Slide Delimiter ───</span>
            </div>
          )
        }

        // 2. Heading 1 (# Title)
        if (/^#\s+/.test(line)) {
          return (
            <div key={i} className="font-bold text-base py-1 text-sky-400 flex items-baseline gap-1.5">
              <span className="text-sky-500/60 text-xs font-mono select-none">#</span>
              <span>{line.replace(/^#\s+/, '')}</span>
            </div>
          )
        }

        // 3. Heading 2 (## Subtitle)
        if (/^##\s+/.test(line)) {
          return (
            <div key={i} className="font-semibold text-sm py-0.5 text-indigo-300 flex items-baseline gap-1.5">
              <span className="text-indigo-500/60 text-xs font-mono select-none">##</span>
              <span>{line.replace(/^##\s+/, '')}</span>
            </div>
          )
        }

        // 4. Heading 3 (### Section)
        if (/^###\s+/.test(line)) {
          return (
            <div key={i} className="font-semibold text-xs py-0.5 text-cyan-300 flex items-baseline gap-1.5">
              <span className="text-cyan-500/60 text-[10px] font-mono select-none">###</span>
              <span>{line.replace(/^###\s+/, '')}</span>
            </div>
          )
        }

        // 5. Callout Directives (:::note, :::important, :::tip, etc.)
        const calloutMatch = line.match(/^:::(note|important|tip|warning|info|security|architecture|arch)(.*)$/i)
        if (calloutMatch) {
          const v = calloutMatch[1].toLowerCase()
          const colorStyles: Record<string, string> = {
            note: 'border-sky-500/50 bg-sky-500/20 text-sky-300',
            important: 'border-red-500/50 bg-red-500/20 text-red-300',
            tip: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300',
            warning: 'border-amber-500/50 bg-amber-500/20 text-amber-300',
            info: 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300',
            security: 'border-purple-500/50 bg-purple-500/20 text-purple-300',
            architecture: 'border-teal-500/50 bg-teal-500/20 text-teal-300',
          }
          return (
            <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold my-1 ${colorStyles[v] ?? 'bg-muted text-foreground'}`}>
              <span>:::{v}</span>
              {calloutMatch[2] && <span className="text-[11px] opacity-80">{calloutMatch[2]}</span>}
            </div>
          )
        }

        // 6. Callout Close
        if (line.trim() === ':::') {
          return (
            <div key={i} className="text-xs font-mono font-bold text-zinc-500 my-0.5">
              :::
            </div>
          )
        }

        // 7. Images ![alt|params](url)
        if (/^!\[.*\]\(.*\)/.test(line)) {
          return (
            <div key={i} className="text-emerald-400 font-mono text-xs py-1 px-2.5 rounded border border-emerald-500/30 bg-emerald-950/40 my-1 flex items-center gap-2">
              <ImageIcon className="size-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">{line}</span>
            </div>
          )
        }

        // 8. Table syntax | col | col |
        if (/^\|.*\|/.test(line)) {
          return (
            <div key={i} className="text-teal-300 font-mono text-xs py-0.5 border-l-2 border-teal-500/50 pl-2">
              {line}
            </div>
          )
        }

        // 9. Code Fences ```
        if (/^```/.test(line)) {
          return (
            <div key={i} className="text-purple-300 font-mono text-xs py-0.5 px-2 rounded border border-purple-500/30 bg-purple-950/40 my-1">
              {line}
            </div>
          )
        }

        // 10. Checklist item
        if (/^-\s+\[(x| )\]/.test(line)) {
          const isDone = line.includes('[x]')
          return (
            <div key={i} className={`py-0.5 text-xs flex items-center gap-1.5 ${isDone ? 'text-emerald-400 font-medium' : 'text-zinc-400'}`}>
              <CheckSquare className="size-3 shrink-0" />
              <span>{line.replace(/^-\s+\[(x| )\]\s*/, '')}</span>
            </div>
          )
        }

        // 11. Bullet item
        if (/^-\s+/.test(line)) {
          return (
            <div key={i} className="text-zinc-300 py-0.5 flex items-baseline gap-2">
              <span className="text-primary text-xs">•</span>
              <span>{line.replace(/^-\s+/, '')}</span>
            </div>
          )
        }

        // 12. Blockquote
        if (/^>\s+/.test(line)) {
          return (
            <div key={i} className="text-amber-200/90 italic border-l-2 border-amber-400/60 pl-3 py-0.5 my-1 text-xs">
              {line}
            </div>
          )
        }

        // Empty line
        if (!line.trim()) {
          return <div key={i} className="h-3" />
        }

        // Normal text
        return (
          <div key={i} className="text-zinc-300 py-0.5 leading-relaxed">
            {line}
          </div>
        )
      })}
    </div>
  )
}

// ─── AI Deck Generator & llms.txt Integration Modal ─────────────────────────
function AiDeckGeneratorModal({
  onApplyMarkdown,
  onClose,
}: {
  onApplyMarkdown: (md: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'generate' | 'llms'>('generate')
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [llmsContent, setLlmsContent] = useState('')

  useEffect(() => {
    setLlmsContent(generateLLMsTxt())
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideCount }),
      })
      const data = await res.json()
      if (data.markdown) {
        onApplyMarkdown(data.markdown)
        onClose()
      }
    } catch {
      // Fallback local generator if offline
      const fallback = `# ${topic}\n\nAutomated presentation generated by Md2Slide.\n\n---\n\n## Overview & Key Drivers\n\n- Milestone execution\n- SLA reliability\n- Developer velocity\n\n:::tip\nModular architecture streamlines team velocity.\n:::`
      onApplyMarkdown(fallback)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const copyLLMs = () => {
    navigator.clipboard.writeText(llmsContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-6 bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Presentation Deck Assistant & llms.txt</h2>
              <p className="text-[11px] text-muted-foreground">Generate complete slide decks with AI or consume dynamic llms.txt specs</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b bg-muted/20 px-6 gap-2 pt-2">
          <button
            onClick={() => setTab('generate')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              tab === 'generate'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="size-3.5" />
            Generate Deck with AI
          </button>
          <button
            onClick={() => setTab('llms')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              tab === 'llms'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode className="size-3.5" />
            Dynamic llms.txt & Agent API
            <Badge variant="outline" className="text-[9px] font-mono text-emerald-500">
              LIVE ENDPOINT
            </Badge>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'generate' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Presentation Topic or Prompt
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Next-Gen Microservice Architecture & Zero-Trust Migration"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick Starter Topics</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Cloud Microservice Architecture & SLAs',
                    'Executive Q4 Business Review & KPIs',
                    'Product Launch & Go-To-Market Strategy',
                    'Enterprise Zero-Trust Security Posture',
                    'Developer Platform SDK & API Strategy',
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setTopic(chip)}
                      className="rounded-lg border bg-muted/30 hover:bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Number of Slides
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{slideCount} Slides</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-500" />
                  What AI will generate:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                  <li>Executive Title Hero slide with subtitle and metadata</li>
                  <li>KPI Data Table with latency targets and availability numbers</li>
                  <li>Mermaid Architecture Flowchart diagram</li>
                  <li>Enterprise Notice cards (:::note, :::security, :::tip)</li>
                  <li>Production launch checklist items (- [x])</li>
                </ul>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!topic.trim() || loading}
                className="w-full h-11 text-sm font-bold shadow-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Generating Presentation...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate & Insert Deck
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Single Source of Truth /llms.txt</h3>
                  <p className="text-xs text-muted-foreground">
                    Exposed dynamically via Next.js route handler. Updates automatically whenever code or templates change.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/llms.txt"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border bg-muted/40 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                  >
                    <ExternalLink className="size-3 text-primary" />
                    Open /llms.txt
                  </a>
                  <Button size="sm" onClick={copyLLMs} className="h-8 gap-1.5 text-xs font-semibold">
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied!' : 'Copy Spec'}
                  </Button>
                </div>
              </div>

              {/* API Endpoints Catalog */}
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { route: 'GET /llms.txt', desc: 'Standard AI Agent instruction prompt' },
                  { route: 'GET /llms-full.txt', desc: 'Full extended spec with all 30 template codes' },
                  { route: 'GET /api/spec', desc: 'JSON syntax, callouts, and image parameters' },
                  { route: 'GET /api/templates', desc: 'JSON catalog of all slide & deck layouts' },
                  { route: 'POST /api/generate-deck', desc: 'Generate structured Markdown deck' },
                  { route: 'POST /api/validate-deck', desc: 'Lint and validate presentation syntax' },
                ].map((ep) => (
                  <div key={ep.route} className="rounded-lg border bg-card p-3 font-mono text-xs">
                    <span className="font-bold text-primary">{ep.route}</span>
                    <p className="font-sans text-[11px] text-muted-foreground mt-0.5">{ep.desc}</p>
                  </div>
                ))}
              </div>

              {/* Live Spec Preview */}
              <div className="rounded-xl border bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-72">
                <pre className="whitespace-pre-wrap leading-relaxed">{llmsContent}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Initial Markdown Content ─────────────────────────────────────────────────
const initialMarkdown = [
  '# The Future of Engineering',
  '',
  'How modern teams build, collaborate, and ship mission-critical systems.',
  '',
  '---',
  '',
  '## Highlights',
  '',
  'What moved the business forward this quarter?',
  '',
  '| Feature | Status | Impact |',
  '| :--- | :--- | :--- |',
  '| **High-Velocity Core** | ✅ Ready | 3.5× Faster Builds |',
  '| **Distributed Caching** | 🔄 In progress | -65% p99 Latency |',
  '| **Zero-Trust Security** | ✅ Complete | SOC2 Certified |',
  '',
  '---',
  '',
  '## Production Alerts & Notices',
  '',
  ':::architecture',
  '**Architecture Review Notice**: All microservices adhere to 12-Factor principles with stateless container execution.',
  ':::',
  '',
  ':::important',
  'Database migration v4.2 requires draining background queue workers before deploying to production.',
  ':::',
  '',
  ':::tip',
  'Use distributed tracing with OpenTelemetry to isolate database bottlenecks.',
  ':::',
  '',
  '---',
  '',
  '## Remote Images & Visuals',
  '',
  ':::note',
  'Remote images support live inspector tuning for fit, max-height, and alignment.',
  ':::',
  '',
  '![Analytics Dashboard|fit:cover|maxH:300|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)',
  '',
  ':::important',
  'High-resolution imagery renders crisp full-width graphics across widescreen and PDF exports.',
  ':::',
  '',
  '---',
  '',
  '## Code & Architecture',
  '',
  '```typescript',
  'import { DeckEngine } from "@deck/core"',
  '',
  'const engine = new DeckEngine({ theme: "dark", ratio: "16:9" })',
  'await engine.renderSlide()',
  '```',
  '',
  ':::tip',
  'Use TypeScript strict mode for maximum reliability and type-checked slide templates.',
  ':::',
  '',
  ':::warning',
  'Never expose production API secrets in client-side presentations.',
  ':::',
].join('\n')

// ─── Slide Parser ─────────────────────────────────────────────────────────────
export const parseSlides = (md: string): Slide[] => {
  if (!md || !md.trim()) {
    return [{ id: 'slide-0', title: 'Untitled Presentation', body: '', accent: 'bg-primary', raw: '' }]
  }

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

  if (!rawSlides.length) {
    return [{ id: 'slide-0', title: 'Untitled Presentation', body: '', accent: 'bg-primary', raw: '' }]
  }

  return rawSlides.map((raw, i) => {
    const titleMatch = raw.match(/^#{1,3}\s+(.+)$/m)
    const title = titleMatch?.[1] ?? `Slide ${i + 1}`
    const body = raw.replace(/^#{1,3}\s+.+$/m, '').trim()
    const accentsList = ['bg-primary', 'bg-chart-2', 'bg-chart-4', 'bg-chart-5']
    return { id: `slide-${i}`, title, body, accent: accentsList[i % accentsList.length], raw }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────
const useDeckStore = create<Store>()(persist((set) => ({
  markdown: initialMarkdown,
  active: 0,
  theme: 'dark',
  ratio: '16:9' as RatioKey,
  fontScale: 1,
  calloutStyle: 'enterprise' as CalloutStyle,
  setMarkdown: (markdown) => set({ markdown }),
  setActive: (active) => set({ active }),
  setTheme: (theme) => set({ theme }),
  setRatio: (ratio) => set({ ratio }),
  setFontScale: (fontScale) => set({ fontScale }),
  setCalloutStyle: (calloutStyle) => set({ calloutStyle }),
  addSlide: (body: string) => set((s) => {
    const updated = `${s.markdown}\n\n---\n\n${body}`
    const parsed = parseSlides(updated)
    return { markdown: updated, active: parsed.length - 1 }
  }),
}), { name: 'Md2Slide-editor-v8' }))

const accentHex = ['#38bdf8', '#4ade80', '#f97316', '#a855f7', '#ec4899', '#14b8a6']
const CANVAS_W_PX = 1280

// ─── Rich Callout Card (MD -> Docs Enterprise Styles) ────────────────────────
function CalloutCard({
  variant,
  content,
  s,
  calloutStyle = 'enterprise',
  isDark = true,
  onSelect,
  isSelected,
}: {
  variant: CalloutVariant
  content: string
  s: (n: number) => number
  calloutStyle?: CalloutStyle
  isDark?: boolean
  onSelect?: () => void
  isSelected?: boolean
}) {
  const cfg = CALLOUT_CONFIG[variant] || CALLOUT_CONFIG.note
  const borderColor = isDark ? cfg.borderDark : cfg.borderLight
  const bgColor = isDark ? cfg.bgDark : cfg.bgLight
  const badgeBg = isDark ? cfg.badgeBgDark : cfg.badgeBgLight
  const badgeText = isDark ? cfg.badgeTextDark : cfg.badgeTextLight
  const textColor = isDark ? 'rgba(255,255,255,0.92)' : '#1e293b'

  // Style 1: Enterprise Docs Style (from MD->Docs screenshot)
  if (calloutStyle === 'enterprise') {
    return (
      <div
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect() } : undefined}
        style={{
          border: `1.5px solid ${borderColor}`,
          borderRadius: s(10),
          background: bgColor,
          marginBottom: s(14),
          overflow: 'hidden',
          cursor: onSelect ? 'pointer' : 'default',
          outline: isSelected ? `2px solid ${cfg.color}` : 'none',
          outlineOffset: 2,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: s(8),
            padding: `${s(8)}px ${s(14)}px`,
            background: badgeBg,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <span style={{ fontSize: s(14), lineHeight: 1 }}>{cfg.icon}</span>
          <span
            style={{
              fontSize: s(11),
              fontWeight: 700,
              color: badgeText,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {cfg.label}
          </span>
          <span style={{ fontSize: s(10), color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', marginLeft: 'auto' }}>
            {cfg.headerTitle}
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            padding: `${s(12)}px ${s(16)}px`,
            fontSize: s(14),
            lineHeight: 1.6,
            color: textColor,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  // Style 2: Left Accent Bar Style
  if (calloutStyle === 'accent') {
    return (
      <div
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect() } : undefined}
        style={{
          display: 'flex',
          gap: s(12),
          borderLeft: `${s(4)}px solid ${cfg.color}`,
          background: bgColor,
          borderRadius: `0 ${s(8)}px ${s(8)}px 0`,
          padding: `${s(12)}px ${s(16)}px`,
          marginBottom: s(14),
          cursor: onSelect ? 'pointer' : 'default',
          outline: isSelected ? `2px solid ${cfg.color}` : 'none',
          outlineOffset: 2,
        }}
      >
        <div style={{ fontSize: s(16), flexShrink: 0, marginTop: s(2) }}>{cfg.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: s(11), fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: s(4) }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: s(14), lineHeight: 1.6, color: textColor }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  // Style 3: Glass Glow Style
  if (calloutStyle === 'glass') {
    return (
      <div
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect() } : undefined}
        style={{
          display: 'flex',
          gap: s(12),
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(16px)',
          border: `1.5px solid ${borderColor}`,
          boxShadow: `0 8px 24px ${cfg.color}22`,
          borderRadius: s(12),
          padding: `${s(14)}px ${s(18)}px`,
          marginBottom: s(14),
          cursor: onSelect ? 'pointer' : 'default',
          outline: isSelected ? `2px solid ${cfg.color}` : 'none',
          outlineOffset: 2,
        }}
      >
        <div
          style={{
            width: s(32),
            height: s(32),
            borderRadius: 999,
            background: badgeBg,
            boxShadow: `0 0 16px ${cfg.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: s(15),
          }}
        >
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: s(11), fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: s(4) }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: s(14), lineHeight: 1.6, color: textColor }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  // Style 4: Modern Card Style (Default)
  return (
    <div
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect() } : undefined}
      style={{
        display: 'flex',
        gap: s(12),
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: s(10),
        padding: `${s(14)}px ${s(18)}px`,
        marginBottom: s(14),
        cursor: onSelect ? 'pointer' : 'default',
        outline: isSelected ? `2px solid ${cfg.color}` : 'none',
        outlineOffset: 2,
      }}
    >
      <div
        style={{
          width: s(32),
          height: s(32),
          borderRadius: s(8),
          background: badgeBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: s(16),
        }}
      >
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: s(11), fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: s(4) }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: s(14), lineHeight: 1.6, color: textColor }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// ─── Slide Markdown Renderer ──────────────────────────────────────────────────
interface SlideMarkdownProps {
  body: string
  fontScale?: number
  calloutStyle?: CalloutStyle
  isDark?: boolean
  onSelect?: (el: SelectedElement) => void
  selectedElement?: SelectedElement
}

function SlideMarkdown({
  body,
  fontScale = 1,
  calloutStyle = 'enterprise',
  isDark = true,
  onSelect,
  selectedElement,
}: SlideMarkdownProps) {
  const s = (base: number) => Math.round(base * fontScale)

  const selStyle = (type: ElementType, key?: string): React.CSSProperties => {
    const isSel = onSelect && selectedElement?.type === type
    return isSel
      ? { outline: '2px solid #38bdf8', outlineOffset: 3, borderRadius: 4, cursor: 'pointer' }
      : onSelect ? { cursor: 'pointer' } : {}
  }

  const segments = parseSlideSegments(body)

  return (
    <>
      {segments.map((seg, si) => {
        if (seg.type === 'callout') {
          const { variant, content } = seg.data
          const isSelected = selectedElement?.type === 'callout' && selectedElement.calloutVariant === variant
          return (
            <CalloutCard
              key={si}
              variant={variant}
              content={content}
              s={s}
              calloutStyle={seg.data.style || calloutStyle}
              isDark={isDark}
              onSelect={onSelect ? () => onSelect({
                type: 'callout',
                calloutVariant: variant,
                calloutStyle: seg.data.style || calloutStyle,
                calloutContent: content,
                calloutRawDirective: seg.data.rawDirective,
              }) : undefined}
              isSelected={isSelected}
            />
          )
        }

        return (
          <ReactMarkdown
            key={si}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({ children }) => (
                <p
                  onClick={onSelect ? () => onSelect({ type: 'text', fontSize: s(15) }) : undefined}
                  style={{ marginBottom: s(12), lineHeight: 1.65, fontSize: s(15), ...selStyle('text') }}
                >
                  {children}
                </p>
              ),
              h1: ({ children }) => (
                <h1
                  onClick={onSelect ? () => onSelect({ type: 'heading', fontSize: s(28) }) : undefined}
                  style={{ marginBottom: s(12), fontWeight: 800, fontSize: s(28), lineHeight: 1.2, color: 'var(--color-foreground)', ...selStyle('heading') }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  onClick={onSelect ? () => onSelect({ type: 'heading', fontSize: s(22) }) : undefined}
                  style={{ marginBottom: s(10), fontWeight: 700, fontSize: s(22), lineHeight: 1.25, color: 'var(--color-foreground)', ...selStyle('heading') }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  onClick={onSelect ? () => onSelect({ type: 'heading', fontSize: s(18) }) : undefined}
                  style={{ marginBottom: s(8), fontWeight: 600, fontSize: s(18), lineHeight: 1.3, color: 'var(--color-foreground)', ...selStyle('heading') }}
                >
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect({ type: 'list' }) } : undefined}
                  style={{ marginBottom: s(14), paddingLeft: s(24), ...selStyle('list') }}
                >
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect({ type: 'list' }) } : undefined}
                  style={{ marginBottom: s(14), paddingLeft: s(24), listStyleType: 'decimal', ...selStyle('list') }}
                >
                  {children}
                </ol>
              ),
              li: ({ children, node }) => {
                const raw = node as any
                const isTask = raw?.children?.[0]?.type === 'element' && raw?.children?.[0]?.tagName === 'input'
                const checked = isTask ? raw?.children?.[0]?.properties?.checked : false
                return (
                  <li style={{ marginBottom: s(6), fontSize: s(15), lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: s(8), listStyle: isTask ? 'none' : undefined }}>
                    {isTask && (
                      <span style={{ width: s(18), height: s(18), borderRadius: s(4), border: `2px solid ${checked ? '#10b981' : 'var(--color-border)'}`, background: checked ? '#10b98122' : 'transparent', flexShrink: 0, marginTop: s(2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {checked && <svg viewBox="0 0 12 12" fill="none" style={{ width: s(11), height: s(11) }}><path d="M2 6l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                    )}
                    <span>{isTask ? (Array.isArray(children) ? children.slice(1) : children) : children}</span>
                  </li>
                )
              },
              blockquote: ({ children }) => (
                <div
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect({ type: 'callout', calloutVariant: 'note' }) } : undefined}
                  style={{
                    display: 'flex',
                    gap: s(12),
                    background: CALLOUT_CONFIG.note.bgDark,
                    border: `1.5px solid ${CALLOUT_CONFIG.note.borderDark}`,
                    borderRadius: s(8),
                    padding: `${s(12)}px ${s(16)}px`,
                    marginBottom: s(14),
                    cursor: onSelect ? 'pointer' : 'default',
                    outline: onSelect && selectedElement?.type === 'callout' ? `2px solid ${CALLOUT_CONFIG.note.color}` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <div style={{ width: s(26), height: s(26), borderRadius: s(6), background: CALLOUT_CONFIG.note.badgeBgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: s(14) }}>ℹ️</div>
                  <div style={{ flex: 1, fontSize: s(14), lineHeight: 1.55 }}>{children}</div>
                </div>
              ),
              code: ({ children, className: cls }) => {
                const isBlock = Boolean(cls?.includes('language-'))
                if (isBlock) {
                  return (
                    <code
                      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect({ type: 'code' }) } : undefined}
                      style={{
                        display: 'block',
                        background: 'color-mix(in oklch, var(--color-muted) 80%, transparent)',
                        borderRadius: s(8),
                        padding: `${s(14)}px ${s(18)}px`,
                        fontFamily: '"JetBrains Mono","Fira Code",monospace',
                        fontSize: s(13),
                        lineHeight: 1.65,
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                        marginBottom: s(14),
                        border: '1px solid var(--color-border)',
                        ...selStyle('code'),
                      }}
                    >
                      {children}
                    </code>
                  )
                }
                return (
                  <code style={{ background: 'var(--color-muted)', borderRadius: s(4), padding: `${s(2)}px ${s(6)}px`, fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: s(13) }}>
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => <pre style={{ marginBottom: s(12), overflowX: 'auto' }}>{children}</pre>,
              table: ({ children }) => (
                <div
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect({ type: 'table' }) } : undefined}
                  style={{ marginBottom: s(16), overflowX: 'auto', width: '100%', ...selStyle('table') }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: s(14) }}>{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead style={{ borderBottom: `2px solid var(--color-border)` }}>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr style={{ borderBottom: `1px solid color-mix(in oklch, var(--color-border) 50%, transparent)` }}>{children}</tr>,
              th: ({ children }) => (
                <th style={{ padding: `${s(10)}px ${s(14)}px`, textAlign: 'left', fontWeight: 700, fontSize: s(13), color: 'var(--color-foreground)', background: 'color-mix(in oklch, var(--color-muted) 40%, transparent)' }}>
                  {children}
                </th>
              ),
              td: ({ children }) => <td style={{ padding: `${s(10)}px ${s(14)}px`, fontSize: s(13), color: 'var(--color-muted-foreground)' }}>{children}</td>,
              img: ({ src, alt }) => {
                const imgStr = typeof src === 'string' ? src : ''
                const altStr = typeof alt === 'string' ? alt : ''
                const imgAttr = parseImageParams(altStr, imgStr)

                const radiusMap: Record<ImgRadius, number> = {
                  none: 0,
                  sm: s(4),
                  md: s(8),
                  lg: s(16),
                  full: 999,
                }

                const alignStyles: React.CSSProperties = {
                  display: 'flex',
                  width: '100%',
                  justifyContent: imgAttr.align === 'left' ? 'flex-start' : imgAttr.align === 'right' ? 'flex-end' : 'center',
                  marginBottom: s(14),
                }

                const isSelected = selectedElement?.type === 'image' && (selectedElement.src === imgStr || selectedElement.rawAlt === altStr)

                return (
                  <span style={alignStyles} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgAttr.src}
                      alt={imgAttr.alt}
                      loading="lazy"
                      onClick={onSelect ? (e) => {
                        e.stopPropagation()
                        onSelect({
                          type: 'image',
                          src: imgAttr.src,
                          alt: imgAttr.alt,
                          rawAlt: altStr,
                          imgFit: imgAttr.fit,
                          imgMaxH: imgAttr.maxH,
                          imgAlign: imgAttr.align,
                          imgWidth: imgAttr.width,
                          imgRadius: imgAttr.radius,
                          imgShadow: imgAttr.shadow,
                        })
                      } : undefined}
                      style={{
                        display: 'block',
                        width: imgAttr.width || '100%',
                        maxHeight: s(imgAttr.maxH),
                        objectFit: imgAttr.fit,
                        borderRadius: radiusMap[imgAttr.radius] ?? s(8),
                        boxShadow: imgAttr.shadow ? (isDark ? '0 12px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.15)') : 'none',
                        outline: isSelected ? '3px solid #38bdf8' : 'none',
                        outlineOffset: 3,
                        cursor: onSelect ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  </span>
                )
              },
              hr: () => <hr style={{ margin: `${s(16)}px 0`, border: 'none', borderTop: '1px solid var(--color-border)' }} />,
              strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--color-foreground)' }}>{children}</strong>,
              em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
              a: ({ href, children }) => <a href={href} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
            }}
          >
            {seg.data}
          </ReactMarkdown>
        )
      })}
    </>
  )
}

// ─── Slide Card Component ─────────────────────────────────────────────────────
interface SlideCardProps {
  slide?: Slide
  index: number
  total?: number
  className?: string
  ratio?: string
  fontScale?: number
  calloutStyle?: CalloutStyle
  theme?: Theme
  onSelectElement?: (el: SelectedElement) => void
  selectedElement?: SelectedElement
}

function SlideCard({
  slide,
  index,
  total = 1,
  className = '',
  ratio = '16/9',
  fontScale = 1,
  calloutStyle = 'enterprise',
  theme = 'dark',
  onSelectElement,
  selectedElement,
}: SlideCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [rw, rh] = ratio.split('/').map(Number)
  const canvasH = Math.round(CANVAS_W_PX * (rh / rw))

  const safeSlide: Slide = slide ?? {
    id: `slide-${index}`,
    title: `Slide ${index + 1}`,
    body: '',
    accent: accentHex[index % accentHex.length],
    raw: '',
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.getBoundingClientRect().width / CANVAS_W_PX)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const accentColor = accentHex[index % accentHex.length]
  const s = (base: number) => Math.round(base * fontScale)
  const isDark = theme === 'dark'

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-border shadow-xl ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div
        style={{
          width: CANVAS_W_PX,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-card)',
          color: 'var(--color-card-foreground)',
          overflow: 'hidden',
          fontFamily: 'system-ui,-apple-system,sans-serif',
        }}
      >
        <div style={{ height: 6, width: '100%', background: accentColor, flexShrink: 0 }} />
        <div style={{ padding: `${s(32)}px ${s(60)}px ${s(16)}px`, flexShrink: 0 }}>
          <div style={{ marginBottom: s(12) }}>
            <span
              style={{
                display: 'inline-block',
                background: `${accentColor}22`,
                color: accentColor,
                borderRadius: 999,
                padding: `${s(3)}px ${s(12)}px`,
                fontSize: s(12),
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {String(index + 1).padStart(2, '0')}{total > 1 ? ` / ${String(total).padStart(2, '0')}` : ''}
            </span>
          </div>
          <h2
            onClick={onSelectElement ? () => onSelectElement({ type: 'heading', fontSize: s(46), fontWeight: 800 }) : undefined}
            style={{
              fontSize: s(46),
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              color: 'var(--color-foreground)',
              margin: 0,
              cursor: onSelectElement ? 'pointer' : 'default',
              outline: onSelectElement && selectedElement?.type === 'heading' ? `2px solid ${accentColor}` : 'none',
              outlineOffset: 4,
              borderRadius: 4,
            }}
          >
            {safeSlide.title}
          </h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: `0 ${s(60)}px ${s(32)}px`, color: 'var(--color-muted-foreground)' }}>
          <SlideMarkdown
            body={safeSlide.body}
            fontScale={fontScale}
            calloutStyle={calloutStyle}
            isDark={isDark}
            onSelect={onSelectElement}
            selectedElement={selectedElement}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Canvas Inspector (Functional 2-Way Sync) ─────────────────────────────────
interface InspectorProps {
  selected: SelectedElement
  fontScale: number
  calloutStyle: CalloutStyle
  onFontScale: (v: number) => void
  onCalloutStyle: (v: CalloutStyle) => void
  onUpdateImage: (updates: Partial<ImageAttributes>) => void
  onUpdateCalloutVariant: (variant: CalloutVariant) => void
  onUpdateCalloutStyle: (style: CalloutStyle, scope: 'single' | 'all') => void
  onClose: () => void
}

function CanvasInspector({
  selected,
  fontScale,
  calloutStyle,
  onFontScale,
  onCalloutStyle,
  onUpdateImage,
  onUpdateCalloutVariant,
  onUpdateCalloutStyle,
  onClose,
}: InspectorProps) {
  const [calloutScope, setCalloutScope] = useState<'single' | 'all'>('single')

  const Stepper = ({
    value,
    min,
    max,
    step = 20,
    onChange,
    label,
  }: {
    value: number
    min: number
    max: number
    step?: number
    onChange: (v: number) => void
    label: string
  }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex size-7 items-center justify-center rounded border bg-muted hover:bg-accent text-foreground transition-colors"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-14 text-center text-sm tabular-nums font-mono font-medium">{value} {label}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex size-7 items-center justify-center rounded border bg-muted hover:bg-accent text-foreground transition-colors"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-4 last:mb-0 border-b pb-4 last:border-0 last:pb-0">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  )

  return (
    <div className="w-64 shrink-0 overflow-y-auto border-l bg-background shadow-lg">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-3.5 bg-muted/30">
        <span className="text-xs font-bold capitalize text-foreground flex items-center gap-1.5">
          <Sliders className="size-3.5 text-primary" />
          {selected.type || 'Slide'} Properties
        </span>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-4">
        {/* Global Slide Font Scale */}
        <Section label="Slide Font Scaling">
          <input
            type="range"
            min={0.6}
            max={1.6}
            step={0.05}
            value={fontScale}
            onChange={(e) => onFontScale(Number(e.target.value))}
            className="h-1.5 w-full accent-primary cursor-pointer"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>60%</span>
            <span className="font-mono font-bold text-primary">{Math.round(fontScale * 100)}%</span>
            <span>160%</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[{ v: 0.8, l: 'S' }, { v: 1, l: 'M' }, { v: 1.2, l: 'L' }, { v: 1.4, l: 'XL' }].map(({ v, l }) => (
              <button
                key={l}
                onClick={() => onFontScale(v)}
                className={`rounded py-1 text-xs font-semibold border transition-colors ${
                  Math.abs(fontScale - v) < 0.06 ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Section>

        {/* Global Deck Callout Design Template */}
        {selected.type !== 'callout' && (
          <Section label="Global Callout Style">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'enterprise', label: 'Enterprise Docs' },
                { key: 'modern', label: 'Modern Card' },
                { key: 'accent', label: 'Left Accent' },
                { key: 'glass', label: 'Glass Glow' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onCalloutStyle(key as CalloutStyle)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                    calloutStyle === key
                      ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Image Controls (Live update + Markdown persistence) */}
        {selected.type === 'image' && (
          <>
            <Section label="Image Fit">
              <div className="grid grid-cols-3 gap-1">
                {(['contain', 'cover', 'fill'] as ImgFit[]).map((fit) => (
                  <button
                    key={fit}
                    onClick={() => onUpdateImage({ fit })}
                    className={`rounded border py-1.5 text-xs font-medium capitalize transition-all ${
                      selected.imgFit === fit ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Max Height">
              <Stepper
                value={selected.imgMaxH ?? 320}
                min={100}
                max={560}
                step={20}
                onChange={(maxH) => onUpdateImage({ maxH })}
                label="px"
              />
              <input
                type="range"
                min={100}
                max={560}
                step={10}
                value={selected.imgMaxH ?? 320}
                onChange={(e) => onUpdateImage({ maxH: Number(e.target.value) })}
                className="mt-2 h-1.5 w-full accent-primary cursor-pointer"
              />
            </Section>

            <Section label="Alignment">
              <div className="flex gap-1.5">
                {([
                  ['left', AlignLeft, 'Left'],
                  ['center', AlignCenter, 'Center'],
                  ['right', AlignRight, 'Right'],
                ] as const).map(([val, Icon, name]) => (
                  <button
                    key={val}
                    onClick={() => onUpdateImage({ align: val as ImgAlign })}
                    className={`flex h-8 flex-1 items-center justify-center gap-1 rounded border text-xs font-medium transition-all ${
                      selected.imgAlign === val ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {name}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Width / Scale">
              <div className="grid grid-cols-4 gap-1">
                {['50%', '75%', '90%', '100%'].map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateImage({ width: w })}
                    className={`rounded border py-1 text-[11px] font-medium transition-all ${
                      selected.imgWidth === w ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Corner Radius">
              <div className="grid grid-cols-4 gap-1">
                {(['none', 'sm', 'md', 'lg'] as ImgRadius[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdateImage({ radius: r })}
                    className={`rounded border py-1 text-[11px] font-medium capitalize transition-all ${
                      selected.imgRadius === r ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Card Drop Shadow">
              <button
                onClick={() => onUpdateImage({ shadow: !selected.imgShadow })}
                className={`flex w-full items-center justify-between rounded-lg border p-2 text-xs font-medium transition-colors ${
                  selected.imgShadow ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <span>Elevation Shadow</span>
                <span className="font-bold">{selected.imgShadow ? 'ON' : 'OFF'}</span>
              </button>
            </Section>
          </>
        )}

        {/* Callout Inspector (Both Per-Callout Style & Global Scope) */}
        {selected.type === 'callout' && (
          <>
            <Section label="Callout Notice Type">
              <p className="mb-2 text-xs text-muted-foreground">Select a notice template variant:</p>
              <div className="space-y-1.5">
                {(Object.keys(CALLOUT_CONFIG) as CalloutVariant[]).map((v) => {
                  const cfg = CALLOUT_CONFIG[v]
                  const isActive = selected.calloutVariant === v
                  return (
                    <button
                      key={v}
                      onClick={() => onUpdateCalloutVariant(v)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left text-xs transition-all ${
                        isActive ? 'border-primary bg-primary/15 font-semibold text-primary shadow-sm' : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="flex-1 font-medium">{cfg.label}</span>
                      {isActive && <Check className="size-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section label="Callout Design Style">
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[
                  { key: 'enterprise', label: 'Enterprise Docs' },
                  { key: 'modern', label: 'Modern Card' },
                  { key: 'accent', label: 'Left Accent' },
                  { key: 'glass', label: 'Glass Glow' },
                ].map(({ key, label }) => {
                  const isCurrent = (selected.calloutStyle || calloutStyle) === key
                  return (
                    <button
                      key={key}
                      onClick={() => onUpdateCalloutStyle(key as CalloutStyle, calloutScope)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/15 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Scope Selector: Single Callout vs All Slides */}
              <div className="rounded-lg border bg-muted/30 p-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apply Design Style To:</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setCalloutScope('single')}
                    className={`rounded py-1 text-[11px] font-semibold transition-all ${
                      calloutScope === 'single'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    This Callout
                  </button>
                  <button
                    onClick={() => setCalloutScope('all')}
                    className={`rounded py-1 text-[11px] font-semibold transition-all ${
                      calloutScope === 'all'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    All Slides
                  </button>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* Code Block Inspector */}
        {selected.type === 'code' && (
          <Section label="Code Block Info">
            <p className="text-xs text-muted-foreground">
              Syntax highlighting active. Supports <code className="rounded bg-muted px-1">typescript</code>, <code className="rounded bg-muted px-1">json</code>, and <code className="rounded bg-muted px-1">mermaid</code> diagrams.
            </p>
          </Section>
        )}
      </div>
    </div>
  )
}

// ─── New Slide Picker Modal (30 Rich Templates) ───────────────────────────────
const SLIDE_CATEGORIES = [
  'All (30)',
  'Basic',
  'Callouts & Notes',
  'Media & Visuals',
  'Data & Tables',
  'Code & Tech',
  'Lists & Process',
] as const

function NewSlidePicker({
  onPick,
  onClose,
}: {
  onPick: (markdown: string) => void
  onClose: () => void
}) {
  const [selectedCat, setSelectedCat] = useState<string>('All (30)')
  const [search, setSearch] = useState<string>('')

  const filtered = useMemo(() => {
    return SLIDE_TEMPLATES.filter((t) => {
      const matchCat = selectedCat === 'All (30)' || t.category === selectedCat
      const matchSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.markdown.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [selectedCat, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <div className="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95 duration-150 flex-col md:flex-row">
        {/* Categories Sidebar */}
        <div className="flex w-full md:w-56 shrink-0 flex-col border-b md:border-b-0 md:border-r bg-muted/20 p-3">
          <div className="mb-2 px-3 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slide Templates</p>
            <p className="text-xs text-muted-foreground mt-0.5">Choose layout or start blank</p>
          </div>

          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible py-1">
            {SLIDE_CATEGORIES.map((c) => {
              const count = c === 'All (30)' ? SLIDE_TEMPLATES.length : SLIDE_TEMPLATES.filter((t) => t.category === c).length
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCat(c)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors shrink-0 md:shrink ${
                    selectedCat === c
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{c}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${selectedCat === c ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-auto hidden md:block border-t pt-3 px-1">
            <button
              onClick={() => {
                onPick('## New Blank Slide\n\nStart writing here...')
                onClose()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-2.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="size-3.5 text-primary" />
              Start from Scratch
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-5 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search 30 templates (e.g., callout, image, metric, code, roadmap)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border bg-muted/30 pl-9 pr-4 text-xs focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onPick('## New Blank Slide\n\nStart writing here...')
                  onClose()
                }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 md:hidden"
              >
                + Blank
              </button>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-4 md:p-6 bg-muted/10">
            {filtered.map((t, idx) => {
              const previewSlide = parseSlides(t.markdown)[0] ?? {
                id: t.id,
                title: t.name,
                body: t.markdown,
                accent: 'bg-primary',
                raw: t.markdown,
              }

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onPick(t.markdown)
                    onClose()
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 hover:border-primary hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-primary/20"
                >
                  {/* Real Live Mini Slide Preview Thumbnail */}
                  <div className="relative w-full overflow-hidden border-b bg-background" style={{ aspectRatio: '16/9' }}>
                    <SlideCard
                      slide={previewSlide}
                      index={idx}
                      ratio="16/9"
                      fontScale={0.8}
                      calloutStyle="enterprise"
                      theme="dark"
                      className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none" />
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="outline" className="text-[9px] font-semibold bg-black/75 text-white/90 backdrop-blur-md border-white/20 shadow-sm">
                        {t.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Template Meta Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-card">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">{t.icon}</span>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {t.name}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {t.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/60 text-[10px] font-semibold text-primary">
                      <span className="text-muted-foreground group-hover:text-primary transition-colors">16:9 layout</span>
                      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Insert Slide →
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <Search className="size-9 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold">No templates match &quot;{search}&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching another keyword (e.g., metric, code, alert, roadmap).</p>
                <button
                  onClick={() => {
                    setSelectedCat('All (30)')
                    setSearch('')
                  }}
                  className="mt-4 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Drawing Layer ────────────────────────────────────────────────────────────
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
    const dn = (e: PointerEvent) => {
      drawing = true
      const [x, y] = pt(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const mv = (e: PointerEvent) => {
      if (!drawing) return
      const [x, y] = pt(e)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    const up = () => {
      drawing = false
    }
    c.addEventListener('pointerdown', dn)
    c.addEventListener('pointermove', mv)
    c.addEventListener('pointerup', up)
    return () => {
      c.removeEventListener('pointerdown', dn)
      c.removeEventListener('pointermove', mv)
      c.removeEventListener('pointerup', up)
    }
  }, [enabled])
  return <canvas ref={ref} className={`absolute inset-0 h-full w-full ${enabled ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden="true" />
}

// ─── Quick Inserts Toolbar ───────────────────────────────────────────────────
const INSERTS = [
  ['Architecture Card', 'Teal contract notice', Shield, ':::architecture\n**Architecture Review Notice**: All microservices adhere to 12-Factor principles.\n:::'],
  ['Important Notice', 'Critical action callout', AlertTriangle, ':::important\nCritical action required before proceeding with deployment.\n:::'],
  ['Pro Tip', 'Best practice guide', Lightbulb, ':::tip\nAlways validate request schemas strictly at the API gateway layer.\n:::'],
  ['Security Guardrail', 'Compliance requirement', Shield, ':::security\nNever hardcode credentials or secrets in source code.\n:::'],
  ['Informational Note', 'Context & notes', MessageSquare, ':::note\nZero customer-facing downtime expected for cached read requests.\n:::'],
  ['KPI Stat Table', 'Comparison metrics table', Table2, '| Metric | Value | QoQ Growth |\n| :--- | :--- | :--- |\n| **Revenue** | **$18.4M** | 🟢 +42% |\n| **Active Users** | **142,000** | 🟢 +68% |'],
  ['Task Checklist', 'Action items list', CheckSquare, '- [x] Security audit signed off\n- [ ] Deploy to staging cluster\n- [ ] Run automated load test'],
  ['Mermaid Flowchart', 'Architecture diagram', Network, '```mermaid\ngraph LR\n  Client --> Gateway\n  Gateway --> Service\n  Service --> Database[(Postgres)]\n```'],
  ['Remote Image', 'Image with properties', ImageIcon, '![Dashboard Visual|fit:cover|maxH:300|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)'],
  ['TypeScript Code', 'Code block snippet', Code2, '```typescript\nconst result = await client.query({ status: "active" })\n```'],
] as const

const insertAt = (v: string, pos: number, s: string) => `${v.slice(0, pos)}${s}${v.slice(pos)}`

// ─── Ratio Picker Component ──────────────────────────────────────────────────
function RatioPicker({ value, onChange }: { value: RatioKey; onChange: (k: RatioKey) => void }) {
  const [open, setOpen] = useState(false)
  const cur = RATIOS.find((r) => r.key === value) ?? RATIOS[0]

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs" onClick={() => setOpen((o) => !o)}>
        <span className="flex h-7 w-10 items-center justify-center rounded border border-border bg-muted/60">
          <span
            className="rounded-sm bg-muted-foreground/40"
            style={{
              aspectRatio: cur.ratio,
              width: cur.orientation === 'portrait' ? 10 : cur.orientation === 'square' ? 16 : 24,
              maxHeight: 20,
            }}
          />
        </span>
        {cur.key} <ChevronDown className="size-3 opacity-50" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-68 overflow-hidden rounded-xl border bg-popover shadow-2xl">
            <p className="border-b px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Presentation Ratio</p>
            <div className="p-1.5">
              {RATIOS.map((r) => {
                const active = r.key === value
                return (
                  <button
                    key={r.key}
                    onClick={() => {
                      onChange(r.key)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted/60">
                      <span
                        className={`rounded-sm ${active ? 'bg-primary/50' : 'bg-muted-foreground/30'}`}
                        style={{
                          aspectRatio: r.ratio,
                          width: r.orientation === 'portrait' ? 10 : r.orientation === 'square' ? 16 : 28,
                          maxHeight: 24,
                        }}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <strong className="text-sm">{r.label}</strong>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {r.badge}
                        </span>
                      </span>
                      <span className="block text-xs text-muted-foreground">{r.note}</span>
                    </span>
                    {active && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main DeckEditor Component ───────────────────────────────────────────────
export function DeckEditor() {
  const {
    markdown,
    active,
    theme,
    ratio,
    fontScale,
    calloutStyle,
    setMarkdown,
    setActive,
    setTheme,
    setRatio,
    setFontScale,
    setCalloutStyle,
    addSlide,
  } = useDeckStore()

  const slides = useMemo(() => parseSlides(markdown), [markdown])
  const current = slides[Math.min(active, slides.length - 1)] ?? slides[0]
  const activeRatio = RATIOS.find((r) => r.key === ratio) ?? RATIOS[0]

  const [sidebar, setSidebar] = useState(true)
  const [deckTemplatesOpen, setDeckTemplatesOpen] = useState(false)
  const [newSlideOpen, setNewSlideOpen] = useState(false)
  const [slash, setSlash] = useState(false)
  const [sourceMode, setSourceMode] = useState<'slide' | 'deck'>('deck')
  const [presenting, setPresenting] = useState(false)
  const [laser, setLaser] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [transition, setTransition] = useState('Fade')
  const [cursor, setCursor] = useState({ x: 50, y: 50 })
  const [toastMessage, setToastMessage] = useState('')
  const [splitPct, setSplitPct] = useState(48)
  const [selectedEl, setSelectedEl] = useState<SelectedElement>({ type: null })
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editorViewMode, setEditorViewMode] = useState<'raw' | 'color'>('raw')

  const splitRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const editor = useRef<HTMLTextAreaElement>(null)

  // Drag splitter
  const onDragStart = (e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || !splitRef.current) return
    const r = splitRef.current.getBoundingClientRect()
    setSplitPct(Math.min(80, Math.max(20, ((e.clientX - r.left) / r.width) * 100)))
  }
  const onDragEnd = () => {
    dragging.current = false
  }

  const slideRaws = useMemo(() => {
    const parts: string[] = []
    let cur = ''
    let inFence = false
    for (const line of markdown.split('\n')) {
      if (/^```/.test(line.trim())) inFence = !inFence
      if (!inFence && line.trim() === '---') {
        if (cur.trim()) parts.push(cur.trim())
        cur = ''
      } else {
        cur += line + '\n'
      }
    }
    if (cur.trim()) parts.push(cur.trim())
    return parts
  }, [markdown])

  const editorValue = sourceMode === 'slide' ? (slideRaws[active] ?? '') : markdown

  const handleEditorChange = useCallback(
    (value: string) => {
      if (sourceMode === 'deck') {
        setMarkdown(value)
      } else {
        const u = [...slideRaws]
        u[active] = value
        setMarkdown(u.join('\n\n---\n\n'))
      }
    },
    [sourceMode, slideRaws, active, setMarkdown]
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const notify = (x: string) => {
    setToastMessage(`${x}`)
    setTimeout(() => setToastMessage(''), 2500)
  }

  const insert = useCallback(
    (snippet: string) => {
      const el = editor.current
      if (sourceMode === 'slide') {
        const base = slideRaws[active] ?? ''
        const pos = el?.selectionStart ?? base.length
        handleEditorChange(insertAt(base, pos, snippet))
      } else {
        const pos = el?.selectionStart ?? markdown.length
        setMarkdown(insertAt(markdown, pos, snippet))
      }
      setSlash(false)
      requestAnimationFrame(() => el?.focus())
    },
    [sourceMode, slideRaws, active, markdown, handleEditorChange, setMarkdown]
  )

  // Keyboard navigation for presentation mode
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!presenting) return
      if (e.key === 'ArrowRight' || e.key === ' ') setActive(Math.min(active + 1, slides.length - 1))
      if (e.key === 'ArrowLeft') setActive(Math.max(active - 1, 0))
      if (e.key === 'Escape') setPresenting(false)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [presenting, active, slides.length, setActive])

  // Functional 2-way sync: updating image attributes in active markdown
  const handleUpdateImage = useCallback(
    (updates: Partial<ImageAttributes>) => {
      if (!selectedEl.src) return

      const currentAttr: ImageAttributes = {
        alt: selectedEl.alt ?? '',
        src: selectedEl.src,
        fit: updates.fit ?? selectedEl.imgFit ?? 'contain',
        maxH: updates.maxH ?? selectedEl.imgMaxH ?? 320,
        align: updates.align ?? selectedEl.imgAlign ?? 'center',
        width: updates.width ?? selectedEl.imgWidth ?? '100%',
        radius: updates.radius ?? selectedEl.imgRadius ?? 'md',
        shadow: updates.shadow !== undefined ? updates.shadow : Boolean(selectedEl.imgShadow),
        rawAlt: selectedEl.rawAlt ?? selectedEl.alt ?? '',
      }

      // Update inspector state immediately for crisp UI feedback
      setSelectedEl((prev) => ({
        ...prev,
        imgFit: currentAttr.fit,
        imgMaxH: currentAttr.maxH,
        imgAlign: currentAttr.align,
        imgWidth: currentAttr.width,
        imgRadius: currentAttr.radius,
        imgShadow: currentAttr.shadow,
      }))

      // Patch the active slide or deck markdown
      const newImgMd = formatImageMarkdown(currentAttr)
      const targetText = sourceMode === 'slide' ? (slideRaws[active] ?? '') : markdown

      // Regex matching any markdown image with the same src
      const escapedSrc = currentAttr.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const imgRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)`)

      if (imgRegex.test(targetText)) {
        const updatedText = targetText.replace(imgRegex, newImgMd)
        handleEditorChange(updatedText)
      }
    },
    [selectedEl, sourceMode, slideRaws, active, markdown, handleEditorChange]
  )

  // Functional 2-way sync: updating callout variant in active markdown
  const handleUpdateCalloutVariant = useCallback(
    (newVariant: CalloutVariant) => {
      if (!selectedEl.calloutVariant) return

      setSelectedEl((prev) => ({ ...prev, calloutVariant: newVariant }))

      const targetText = sourceMode === 'slide' ? (slideRaws[active] ?? '') : markdown
      const oldVariant = selectedEl.calloutVariant

      // Replace :::oldVariant with :::newVariant or > [!OLD] with > [!NEW]
      let updatedText = targetText.replace(new RegExp(`:::${oldVariant}\\b`, 'i'), `:::${newVariant}`)
      if (updatedText === targetText) {
        updatedText = targetText.replace(new RegExp(`>\\s*\\[!${oldVariant}\\]`, 'i'), `> [!${newVariant.toUpperCase()}]`)
      }
      if (updatedText !== targetText) {
        handleEditorChange(updatedText)
      }
    },
    [selectedEl, sourceMode, slideRaws, active, markdown, handleEditorChange]
  )

  // Functional 2-way sync: updating callout style (single callout or all slides)
  const handleUpdateCalloutStyle = useCallback(
    (newStyle: CalloutStyle, scope: 'single' | 'all') => {
      setSelectedEl((prev) => ({ ...prev, calloutStyle: newStyle }))

      if (scope === 'all') {
        setCalloutStyle(newStyle)
        notify(`Applied ${newStyle} style across all slides`)
      } else {
        const targetText = sourceMode === 'slide' ? (slideRaws[active] ?? '') : markdown
        const variant = selectedEl.calloutVariant || 'note'

        // Match :::variant or :::variant|style:...
        const dirRegex = new RegExp(`:::(?:${variant})(?:[|:\\s\\[{]+(?:style[:=])?[a-zA-Z]+[\\]}]*)?`, 'i')
        if (dirRegex.test(targetText)) {
          const updatedText = targetText.replace(dirRegex, `:::${variant}|style:${newStyle}`)
          handleEditorChange(updatedText)
          notify(`Applied ${newStyle} to this callout`)
        } else {
          // If GitHub alert syntax > [!NOTE]
          const ghRegex = new RegExp(`>\\s*\\[!(?:${variant})(?:[|:\\s]+(?:style[:=])?[a-zA-Z]+)?\\]`, 'i')
          if (ghRegex.test(targetText)) {
            const updatedText = targetText.replace(ghRegex, `> [!${variant.toUpperCase()}|style:${newStyle}]`)
            handleEditorChange(updatedText)
            notify(`Applied ${newStyle} to this callout`)
          }
        }
      }
    },
    [selectedEl, sourceMode, slideRaws, active, markdown, handleEditorChange, setCalloutStyle]
  )

  // ── Presentation Mode ───────────────────────────────────────────────────────
  if (presenting) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-2">
          <span className="font-mono text-sm text-white/60 flex items-center gap-2">
            <Presentation className="size-4 text-primary" />
            Md2Slide / PRESENTATION
          </span>
          <div className="flex items-center gap-2">
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white focus:outline-none"
            >
              <option value="Fade">Fade Transition</option>
              <option value="Slide">Slide Transition</option>
              <option value="None">Instant</option>
            </select>
            <RatioPicker value={ratio} onChange={setRatio} />
            <Button variant={laser ? 'secondary' : 'ghost'} size="sm" onClick={() => setLaser(!laser)}>
              <Zap className="mr-1 size-3.5" />Laser
            </Button>
            <Button variant={drawing ? 'secondary' : 'ghost'} size="sm" onClick={() => setDrawing(!drawing)}>
              <Pencil className="mr-1 size-3.5" />Draw
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPresenting(false)}>
              <X className="mr-1 size-3.5" />Exit
            </Button>
          </div>
        </header>

        <main
          className="relative flex flex-1 items-center justify-center overflow-hidden p-8"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setCursor({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
          }}
        >
          <div className={`relative w-full max-w-6xl transition-all duration-500 ${transition === 'Slide' ? 'animate-in slide-in-from-right-4' : ''}`}>
            <SlideCard
              slide={current}
              index={active}
              total={slides.length}
              ratio={activeRatio.ratio}
              fontScale={fontScale}
              calloutStyle={calloutStyle}
              theme="dark"
              className="w-full"
            />
            <div className={`absolute inset-0 ${drawing ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <DrawingLayer enabled={drawing} />
            </div>
          </div>

          {laser && (
            <div
              className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_24px_10px_rgba(239,68,68,0.65)]"
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
            />
          )}

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => setActive(Math.max(active - 1, 0))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-mono tabular-nums">
              {active + 1} / {slides.length}
            </span>
            <Button variant="secondary" size="icon" onClick={() => setActive(Math.min(active + 1, slides.length - 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // ── Editor Mode ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top Main Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 md:px-5 bg-card/40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebar(!sidebar)} title="Toggle navigation">
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-2 font-bold text-base">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Presentation className="size-4" />
            </div>
            Md2Slide
          </div>
          <Separator orientation="vertical" className="h-5" />
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Quarterly Review Deck</span>
          <Badge variant="secondary" className="font-mono text-[10px]">v2.0 Draft</Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Callout Style Selector in Header */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-1">
            <Palette className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Style:</span>
            <select
              value={calloutStyle}
              onChange={(e) => setCalloutStyle(e.target.value as CalloutStyle)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="enterprise">Enterprise Docs</option>
              <option value="modern">Modern Card</option>
              <option value="accent">Left Accent</option>
              <option value="glass">Glass Glow</option>
            </select>
          </div>

          <RatioPicker value={ratio} onChange={setRatio} />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            {theme === 'dark' ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-indigo-500" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5 font-semibold text-primary border-primary/40 hover:bg-primary/10 shadow-xs"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>AI & llms.txt</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => notify('PDF Export generated')}>
            <Download className="mr-1.5 size-3.5" />Export
          </Button>

          <Button size="sm" onClick={() => setPresenting(true)} className="font-semibold shadow-sm">
            <MonitorPlay className="mr-1.5 size-3.5" />Present
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        {sidebar && (
          <aside className="hidden w-52 shrink-0 flex-col overflow-y-auto border-r bg-muted/15 md:flex">
            <nav className="flex flex-col gap-1 p-2.5">
              <Button variant="secondary" className="justify-start gap-2 text-xs font-semibold">
                <FileText className="size-3.5" />Active Editor
              </Button>
              <Button variant="ghost" className="justify-start gap-2 text-xs text-primary font-medium hover:bg-primary/10" onClick={() => setAiModalOpen(true)}>
                <Bot className="size-3.5 text-primary" />AI Deck Assistant
                <Badge className="ml-auto text-[9px] font-mono bg-primary/20 text-primary border-primary/30" variant="outline">AI</Badge>
              </Button>
              <Button variant="ghost" className="justify-start gap-2 text-xs" onClick={() => setNewSlideOpen(true)}>
                <Plus className="size-3.5 text-primary" />New Slide
                <Badge className="ml-auto text-[10px]" variant="outline">30</Badge>
              </Button>
              <Button variant="ghost" className="justify-start gap-2 text-xs" onClick={() => setDeckTemplatesOpen(true)}>
                <LayoutTemplate className="size-3.5" />Deck Templates
              </Button>
              <Button variant="ghost" className="justify-start gap-2 text-xs">
                <Archive className="size-3.5" />Archive
              </Button>
            </nav>

            <Separator />

            <div className="flex flex-col gap-2 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">My Decks</span>
              {[
                { title: 'Quarterly Review', count: slides.length },
                { title: 'Product Architecture', count: 6 },
                { title: 'Security & Compliance', count: 8 },
              ].map((d, i) => (
                <button
                  key={d.title}
                  onClick={() => i === 0 && setMarkdown(initialMarkdown)}
                  className="rounded-lg p-2 text-left text-xs hover:bg-muted transition-colors"
                >
                  <p className="font-semibold text-foreground">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">{d.count} slides · saved locally</p>
                </button>
              ))}
            </div>

            <div className="mt-auto p-3 border-t bg-muted/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Quick Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Click any image or callout to adjust fit, height, alignment, or template styles.
              </p>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Sub-toolbar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-3.5 bg-muted/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setSidebar(!sidebar)} title="Toggle sidebar">
                <PanelLeft className="size-3.5" />
              </Button>
              <span className="font-medium">Slide {active + 1} of {slides.length}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-foreground font-semibold truncate max-w-[200px]">{current?.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={sourceMode === 'slide' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSourceMode(sourceMode === 'slide' ? 'deck' : 'slide')}
              >
                {sourceMode === 'slide' ? 'Editing Current Slide' : 'Editing Full Deck'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold"
                onClick={() => setNewSlideOpen(true)}
              >
                <Plus className="mr-1 size-3 text-primary" />Add Slide
              </Button>
            </div>
          </div>

          {/* Split Pane: Editor + Preview + Inspector */}
          <div ref={splitRef} className="flex min-h-0 flex-1 overflow-hidden" onPointerMove={onDragMove} onPointerUp={onDragEnd}>
            {/* Markdown Editor Pane */}
            <section className="relative flex min-h-0 flex-col overflow-hidden border-r" style={{ width: `${splitPct}%`, minWidth: '20%' }}>
              <div className="flex h-9 shrink-0 items-center justify-between border-b px-3 bg-muted/20">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Code2 className="size-3.5 text-primary" />Markdown Source
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    {sourceMode === 'slide' ? 'SLIDE' : 'DECK'}
                  </Badge>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant={editorViewMode === 'color' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 font-semibold"
                    onClick={() => setEditorViewMode(editorViewMode === 'color' ? 'raw' : 'color')}
                    title="Toggle syntax color coding"
                  >
                    <Palette className="size-3 text-primary" />
                    {editorViewMode === 'color' ? 'Color Coded' : 'Syntax Colors'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setSlash(true)}>
                    <Zap className="mr-1 size-3 text-primary" />Inserts
                  </Button>
                </div>
              </div>

              {editorViewMode === 'color' ? (
                <div className="relative min-h-0 flex-1 flex flex-col bg-zinc-950">
                  <div className="flex h-7 shrink-0 items-center justify-between border-b border-zinc-800 px-3 bg-zinc-900/60 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
                      <Palette className="size-3" />
                      SYNTAX COLOR CODED VIEW
                    </span>
                    <button
                      onClick={() => setEditorViewMode('raw')}
                      className="text-primary hover:underline font-semibold"
                    >
                      Switch to Raw Edit ✎
                    </button>
                  </div>
                  <ColorCodedMarkdown markdown={editorValue} className="flex-1" />
                </div>
              ) : (
                <Textarea
                  ref={editor}
                  value={editorValue}
                  onChange={(e) => {
                    handleEditorChange(e.target.value)
                    setSlash(e.target.value.slice(0, e.target.selectionStart).split(/\s/).at(-1) === '/')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '/') setSlash(true)
                    if (e.key === 'Escape') setSlash(false)
                    if (e.key === 'Enter' && slash && INSERTS[0]) {
                      e.preventDefault()
                      insert(INSERTS[0][3])
                    }
                  }}
                  className="min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-background p-5 font-mono text-sm leading-7 focus-visible:ring-0"
                  spellCheck={false}
                />
              )}

              {/* Slash Quick Insert Dropdown */}
              {slash && (
                <div className="absolute left-4 right-4 top-12 z-30 max-h-80 overflow-auto rounded-xl border bg-popover p-2 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b px-2 pb-2">
                    <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Zap className="size-3.5 text-primary" />Insert Block or Template
                    </span>
                    <Badge variant="secondary" className="text-[10px]">ESC to close</Badge>
                  </div>
                  <div className="p-1 space-y-1">
                    {INSERTS.map(([label, detail, Icon, code]) => (
                      <button
                        key={label}
                        onClick={() => insert(code)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted">
                          <Icon className="size-3.5 text-primary" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <strong className="block text-xs text-foreground font-semibold">{label}</strong>
                          <small className="text-[11px] text-muted-foreground">{detail}</small>
                        </span>
                        <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1">↵</kbd>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Split Resizer Handle */}
            <div
              onPointerDown={onDragStart}
              className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border hover:bg-primary/60 active:bg-primary transition-colors select-none"
            >
              <div className="flex flex-col gap-[3px] opacity-0 transition-opacity group-hover:opacity-100">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="size-1 rounded-full bg-primary" />
                ))}
              </div>
            </div>

            {/* Live Preview + Canvas Inspector */}
            <div className="flex min-h-0 overflow-hidden" style={{ flex: 1, minWidth: '20%' }}>
              <section className="flex min-h-0 flex-1 flex-col bg-muted/15 overflow-hidden">
                <div className="flex h-9 shrink-0 items-center justify-between border-b px-3 bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />Live Interactive Preview
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedEl.type && (
                      <Badge variant="secondary" className="text-[10px] font-medium text-primary">
                        Inspecting {selectedEl.type}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-emerald-500 font-mono">
                      AUTO-SAVED
                    </Badge>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center">
                  <SlideCard
                    slide={current}
                    index={active}
                    total={slides.length}
                    ratio={activeRatio.ratio}
                    fontScale={fontScale}
                    calloutStyle={calloutStyle}
                    theme={theme}
                    className="w-full max-w-5xl"
                    onSelectElement={(el) => setSelectedEl(el)}
                    selectedElement={selectedEl}
                  />
                </div>
              </section>

              {/* Inspector Pane */}
              {selectedEl.type && (
                <CanvasInspector
                  selected={selectedEl}
                  fontScale={fontScale}
                  calloutStyle={calloutStyle}
                  onFontScale={setFontScale}
                  onCalloutStyle={setCalloutStyle}
                  onUpdateImage={handleUpdateImage}
                  onUpdateCalloutVariant={handleUpdateCalloutVariant}
                  onUpdateCalloutStyle={handleUpdateCalloutStyle}
                  onClose={() => setSelectedEl({ type: null })}
                />
              )}
            </div>
          </div>

          {/* Filmstrip Bottom Bar */}
          <div className="flex h-[108px] shrink-0 items-center gap-3 overflow-x-auto border-t bg-background px-4 py-2.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`relative h-[78px] shrink-0 overflow-hidden rounded-lg border-2 transition-all group ${
                  i === active ? 'border-primary shadow-lg ring-2 ring-primary/40' : 'border-border/60 opacity-60 hover:opacity-100'
                }`}
                style={{ aspectRatio: '16/9', width: 'auto' }}
              >
                <SlideCard
                  slide={s}
                  index={i}
                  ratio="16/9"
                  fontScale={fontScale}
                  calloutStyle={calloutStyle}
                  theme={theme}
                  className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none pointer-events-none"
                />
                <span className="absolute bottom-1 right-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-mono text-white">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
            ))}

            {/* New Slide Button — Opens 30 Templates Picker */}
            <button
              onClick={() => setNewSlideOpen(true)}
              className="flex h-[78px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 text-muted-foreground hover:border-primary hover:bg-muted/50 hover:text-foreground transition-all group"
              style={{ aspectRatio: '16/9', width: 'auto' }}
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="size-4" />
              </div>
              <span className="text-[10px] font-bold">New Slide</span>
            </button>
          </div>
        </main>
      </div>

      {/* Deck Templates Modal (Full Presentation Load with live visual thumbnails) */}
      {deckTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95 flex flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-card/60">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-primary" />
                  Deck Templates (Full Multi-Slide Presentations)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Click any template to load a complete presentation structure</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDeckTemplatesOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto p-6 bg-muted/10">
              {[
                {
                  name: 'Executive Business Review',
                  desc: 'Quarterly review with KPI metrics, status roadmap, and SLA targets',
                  slidesCount: 5,
                  markdown: initialMarkdown,
                },
                {
                  name: 'Architecture Technical Deep-Dive',
                  desc: 'Mermaid microservice flows, sequence diagrams, and security notices',
                  slidesCount: 4,
                  markdown: '# Cloud Microservice Architecture\n\nHigh-availability distributed backend systems.\n\n---\n\n## System Architecture Overview\n\n```mermaid\ngraph LR\n  Client --> Gateway\n  Gateway --> Auth\n  Gateway --> API\n  API --> DB[(Postgres)]\n```\n\n:::architecture\nDecoupled event streams ensure microservices process background tasks asynchronously.\n:::\n\n---\n\n## Security Guardrails\n\n:::security\nNever hardcode credentials or secrets in source code.\n:::',
                },
                {
                  name: 'Product Launch & Showcase',
                  desc: 'Feature comparison matrices, hero visual cards, and release checklist',
                  slidesCount: 4,
                  markdown: '# Next-Gen Platform Launch\n\nAccelerating developer velocity and team momentum.\n\n---\n\n## Product Visual\n\n![Workspace|fit:cover|maxH:320|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)\n\n:::tip\nModular architecture enables rapid parallel experimentation.\n:::\n\n---\n\n## Go-Live Checklist\n\n- [x] Security audit signed off\n- [x] Load testing verified\n- [ ] Production rollout complete',
                },
                {
                  name: 'Security & Compliance Briefing',
                  desc: 'Zero-trust guardrails, SOC2 checklists, and audit notice cards',
                  slidesCount: 3,
                  markdown: '# Enterprise Security Posture\n\nZero-trust architecture and SOC2 compliance controls.\n\n---\n\n## Compliance Notice\n\n:::security\nAll microservices require mTLS encryption in transit and AES-256 at rest.\n:::\n\n:::important\nKeys rotated automatically every 90 days via KMS.\n:::',
                },
                {
                  name: 'Developer Platform Strategy',
                  desc: 'API SDK walkthroughs, code samples, and performance benchmarking',
                  slidesCount: 4,
                  markdown: '# Developer Platform SDK\n\nUnified TypeScript and Go client ecosystem.\n\n---\n\n## SDK Usage\n\n```typescript\nimport { Client } from "@deck/sdk"\nconst client = new Client({ apiKey: process.env.API_KEY })\nawait client.init()\n```\n\n:::note\np99 latency < 40ms across all global edge regions.\n:::',
                },
                {
                  name: 'Startup Pitch & Growth Narrative',
                  desc: 'Market insights, 3-metric KPI highlights, and vision statement',
                  slidesCount: 3,
                  markdown: '# Disrupting Modern Collaboration\n\nHigh-velocity presentation authoring with Markdown.\n\n---\n\n## Traction & Growth\n\n| Metric | Value | Growth |\n| :--- | :--- | :--- |\n| **ARR** | **$18.4M** | 🟢 +42% |\n| **Active Users** | **142K** | 🟢 +68% |\n\n:::tip\nNet retention rate top quartile at 128%.\n:::',
                },
              ].map((tpl, i) => {
                const previewSlide = parseSlides(tpl.markdown)[0] ?? {
                  id: `deck-preview-${i}`,
                  title: tpl.name,
                  body: tpl.desc,
                  accent: 'bg-primary',
                  raw: tpl.markdown,
                }

                return (
                  <button
                    key={tpl.name}
                    onClick={() => {
                      setMarkdown(tpl.markdown)
                      setActive(0)
                      setDeckTemplatesOpen(false)
                      notify(`Loaded ${tpl.name}`)
                    }}
                    className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 hover:border-primary hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-primary/20"
                  >
                    {/* Live Slide Thumbnail */}
                    <div className="relative w-full overflow-hidden border-b bg-background" style={{ aspectRatio: '16/9' }}>
                      <SlideCard
                        slide={previewSlide}
                        index={i}
                        ratio="16/9"
                        fontScale={0.8}
                        calloutStyle="enterprise"
                        theme="dark"
                        className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none pointer-events-none select-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none" />
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="outline" className="text-[9px] font-semibold bg-black/75 text-white/90 backdrop-blur-md border-white/20 shadow-sm">
                          {tpl.slidesCount} Slides
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between bg-card">
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {tpl.name}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                          {tpl.desc}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/60 text-[10px] font-semibold text-primary">
                        <span className="text-muted-foreground group-hover:text-primary transition-colors">Full Deck</span>
                        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Load Presentation →
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* New Slide Picker Modal (30 Per-Slide Templates) */}
      {newSlideOpen && (
        <NewSlidePicker
          onPick={(md) => {
            addSlide(md)
            notify('Added new slide to deck')
          }}
          onClose={() => setNewSlideOpen(false)}
        />
      )}

      {/* AI Deck Generator & llms.txt Modal */}
      {aiModalOpen && (
        <AiDeckGeneratorModal
          onApplyMarkdown={(md) => {
            setMarkdown(md)
            setActive(0)
            notify('Generated presentation with AI')
          }}
          onClose={() => setAiModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-2">
          <CheckCheck className="size-4 text-emerald-500" />
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export { useDeckStore }
