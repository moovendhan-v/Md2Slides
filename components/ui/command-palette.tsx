'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  MonitorPlay,
  Share2,
  Download,
  Moon,
  Sun,
  Plus,
  Network,
  Code2,
  Shield,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
  Terminal,
  FileCode,
  LayoutTemplate,
  Presentation,
  Clock,
} from 'lucide-react'

export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  category: 'Actions' | 'Navigation' | 'Appearance' | 'Developer Inserts'
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  slides: Array<{ id: string; title: string }>
  activeSlide: number
  onSelectSlide: (index: number) => void
  onPresent: () => void
  onPresenterView: () => void
  onShare: () => void
  onExportHtml: () => void
  onExportMarkdown: () => void
  onOpenAi: () => void
  onToggleTheme: () => void
  currentTheme: 'dark' | 'light'
  onSelectRatio: (ratio: any) => void
  onInsert: (snippet: string) => void
}

export function CommandPalette({
  open,
  onClose,
  slides,
  activeSlide,
  onSelectSlide,
  onPresent,
  onPresenterView,
  onShare,
  onExportHtml,
  onExportMarkdown,
  onOpenAi,
  onToggleTheme,
  currentTheme,
  onSelectRatio,
  onInsert,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build commands list
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Actions
      {
        id: 'action-present',
        title: 'Start Fullscreen Presentation',
        subtitle: 'Enter distraction-free presentation mode',
        category: 'Actions',
        icon: MonitorPlay,
        shortcut: 'P',
        action: () => {
          onPresent()
          onClose()
        },
      },
      {
        id: 'action-presenter-view',
        title: 'Open Dual-Screen Presenter View',
        subtitle: 'Presentation mode with live timer & speaker notes',
        category: 'Actions',
        icon: Clock,
        shortcut: 'N',
        action: () => {
          onPresenterView()
          onClose()
        },
      },
      {
        id: 'action-share',
        title: 'Copy Shareable Link',
        subtitle: 'Encode deck into URL hash for instant sharing',
        category: 'Actions',
        icon: Share2,
        shortcut: 'S',
        action: () => {
          onShare()
          onClose()
        },
      },
      {
        id: 'action-export-html',
        title: 'Export Standalone HTML Bundle',
        subtitle: 'Self-contained presentation that runs offline',
        category: 'Actions',
        icon: Download,
        action: () => {
          onExportHtml()
          onClose()
        },
      },
      {
        id: 'action-export-md',
        title: 'Download Markdown (.md)',
        subtitle: 'Save presentation source file',
        category: 'Actions',
        icon: FileCode,
        action: () => {
          onExportMarkdown()
          onClose()
        },
      },
      {
        id: 'action-ai',
        title: 'Open AI Assistant & llms.txt',
        subtitle: 'Generate slides with AI or view prompt catalog',
        category: 'Actions',
        icon: Sparkles,
        action: () => {
          onOpenAi()
          onClose()
        },
      },

      // Appearance
      {
        id: 'theme-toggle',
        title: currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        subtitle: 'Toggle presentation color scheme',
        category: 'Appearance',
        icon: currentTheme === 'dark' ? Sun : Moon,
        action: () => {
          onToggleTheme()
          onClose()
        },
      },
      {
        id: 'ratio-16-9',
        title: 'Aspect Ratio: 16 : 9 (Widescreen)',
        subtitle: 'Standard HD & 4K presentation display',
        category: 'Appearance',
        icon: Layers,
        action: () => {
          onSelectRatio('16:9')
          onClose()
        },
      },
      {
        id: 'ratio-16-10',
        title: 'Aspect Ratio: 16 : 10 (MacBook)',
        subtitle: 'Optimized for laptops and modern displays',
        category: 'Appearance',
        icon: Layers,
        action: () => {
          onSelectRatio('16:10')
          onClose()
        },
      },
      {
        id: 'ratio-4-3',
        title: 'Aspect Ratio: 4 : 3 (Classic)',
        subtitle: 'Legacy projector and conference display',
        category: 'Appearance',
        icon: Layers,
        action: () => {
          onSelectRatio('4:3')
          onClose()
        },
      },

      // Developer Inserts
      {
        id: 'insert-mermaid-flow',
        title: 'Insert Mermaid Flowchart',
        subtitle: 'Live microservice & architecture diagram',
        category: 'Developer Inserts',
        icon: Network,
        action: () => {
          onInsert('```mermaid\ngraph LR\n  Client[Web App] --> Gateway[API Gateway]\n  Gateway --> Auth[Auth Service]\n  Gateway --> Core[Core Engine]\n  Core --> DB[(PostgreSQL)]\n  Core --> Cache[(Redis Cache)]\n```')
          onClose()
        },
      },
      {
        id: 'insert-mermaid-seq',
        title: 'Insert Mermaid Sequence Diagram',
        subtitle: 'API request/response interaction flow',
        category: 'Developer Inserts',
        icon: Network,
        action: () => {
          onInsert('```mermaid\nsequenceDiagram\n  autonumber\n  actor Client\n  participant Gateway as API Gateway\n  participant Auth as Auth Service\n  participant DB as Database\n\n  Client->>Gateway: POST /api/v1/login\n  Gateway->>Auth: Validate Credentials\n  Auth->>DB: Query User\n  DB-->>Auth: User Record\n  Auth-->>Gateway: 200 OK (JWT)\n  Gateway-->>Client: { token: "ey..." }\n```')
          onClose()
        },
      },
      {
        id: 'insert-code-diff',
        title: 'Insert Git Code Diff',
        subtitle: 'Green (+) and red (-) line highlighting',
        category: 'Developer Inserts',
        icon: Terminal,
        action: () => {
          onInsert('```diff\n- const user = await db.users.find({ id })\n- if (!user) throw new NotFoundError()\n+ const user = await cache.getOrSet(`user:${id}`, () => (\n+   db.users.findUniqueOrThrow({ where: { id } })\n+ ))\n```')
          onClose()
        },
      },
      {
        id: 'insert-ts-code',
        title: 'Insert TypeScript Code Snippet',
        subtitle: 'Syntax highlighted TypeScript block',
        category: 'Developer Inserts',
        icon: Code2,
        action: () => {
          onInsert('```typescript\nimport { createClient } from "@company/sdk"\n\nconst client = createClient({ apiKey: process.env.API_KEY })\nconst result = await client.users.list({ status: "active" })\n```')
          onClose()
        },
      },
      {
        id: 'insert-arch-callout',
        title: 'Insert Architecture Contract Callout',
        subtitle: 'Teal architectural notice block',
        category: 'Developer Inserts',
        icon: Shield,
        action: () => {
          onInsert(':::architecture\n**Architecture Review Notice**: All microservices adhere to 12-Factor principles.\n:::')
          onClose()
        },
      },
    ]

    // Navigation slides
    slides.forEach((slide, idx) => {
      list.push({
        id: `nav-slide-${idx}`,
        title: `Slide ${idx + 1}: ${slide.title || 'Untitled Slide'}`,
        subtitle: idx === activeSlide ? 'Current Active Slide' : `Jump to Slide ${idx + 1}`,
        category: 'Navigation',
        icon: Presentation,
        action: () => {
          onSelectSlide(idx)
          onClose()
        },
      })
    })

    return list
  }, [
    slides,
    activeSlide,
    currentTheme,
    onPresent,
    onPresenterView,
    onShare,
    onExportHtml,
    onExportMarkdown,
    onOpenAi,
    onToggleTheme,
    onSelectRatio,
    onInsert,
    onSelectSlide,
    onClose,
  ])

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    )
  }, [commands, query])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!open) return null

  // Group filtered items by category
  const groupedCategories = ['Actions', 'Navigation', 'Appearance', 'Developer Inserts'] as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-background/70 backdrop-blur-md animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="relative flex items-center border-b border-border/70 px-4 py-3.5">
          <Search className="size-5 text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search slides... (e.g. present, diff, mermaid, slide 3)"
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-border/30"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching commands or slides found for &quot;{query}&quot;
            </div>
          ) : (
            groupedCategories.map((cat) => {
              const items = filteredCommands.filter((c) => c.category === cat)
              if (items.length === 0) return null

              return (
                <div key={cat} className="py-1.5 first:pt-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {cat}
                  </div>
                  {items.map((item) => {
                    const globalIdx = filteredCommands.findIndex((c) => c.id === item.id)
                    const isSelected = globalIdx === selectedIndex
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                              isSelected
                                ? 'border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground'
                                : 'border-border/60 bg-muted/50 text-muted-foreground'
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{item.title}</div>
                            {item.subtitle && (
                              <div
                                className={`truncate text-xs ${
                                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.shortcut && (
                          <span
                            className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold ${
                              isSelected
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-muted text-muted-foreground border border-border/60'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>Md2Slides Command Center</div>
        </div>
      </div>
    </div>
  )
}
