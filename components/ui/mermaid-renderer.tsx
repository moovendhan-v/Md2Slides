'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, Check, Copy, RefreshCw } from 'lucide-react'

interface MermaidRendererProps {
  chart: string
  isDark?: boolean
  fontScale?: number
}

export function MermaidRenderer({
  chart,
  isDark = true,
  fontScale = 1,
}: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isRendering, setIsRendering] = useState(true)
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, '_')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    async function renderChart() {
      if (!chart.trim()) {
        setSvg('')
        setError(null)
        setIsRendering(false)
        return
      }

      setIsRendering(true)
      setError(null)

      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'var(--font-sans, "Inter", -apple-system, sans-serif)',
          themeVariables: isDark
            ? {
                darkMode: true,
                background: '#090d16',
                primaryColor: '#38bdf8',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#0284c7',
                lineColor: '#94a3b8',
                secondaryColor: '#818cf8',
                tertiaryColor: '#1e293b',
              }
            : {
                darkMode: false,
                background: '#ffffff',
                primaryColor: '#0284c7',
                primaryTextColor: '#0f172a',
                primaryBorderColor: '#38bdf8',
                lineColor: '#64748b',
                secondaryColor: '#6366f1',
                tertiaryColor: '#f1f5f9',
              },
        })

        const renderId = `mermaid_${uniqueId}_${Date.now()}`
        const cleanChart = chart.trim()
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanChart)

        if (isMounted) {
          setSvg(renderedSvg)
          setError(null)
          setIsRendering(false)
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Mermaid rendering error:', err)
          setError(err?.message || 'Failed to render Mermaid diagram syntax.')
          setIsRendering(false)
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, isDark, uniqueId])

  const handleCopy = () => {
    navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = (base: number) => Math.round(base * fontScale)

  if (error) {
    return (
      <div
        className="my-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs font-mono text-destructive"
        style={{ fontSize: s(12) }}
      >
        <div className="flex items-center gap-2 mb-2 font-semibold text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>Mermaid Syntax Error</span>
        </div>
        <div className="text-muted-foreground mb-3 whitespace-pre-wrap">{error}</div>
        <pre className="bg-background/80 p-2.5 rounded-md border border-border text-[11px] overflow-x-auto">
          {chart}
        </pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="group relative my-4 flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm transition-all hover:border-primary/40"
      style={{
        padding: `${s(16)}px`,
        marginBottom: `${s(16)}px`,
      }}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-10">
        <div
          role="button"
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCopy()
            }
          }}
          className="flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md border border-border bg-background/90 px-2 text-[11px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-muted transition-colors"
          title="Copy Mermaid Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </div>
      </div>

      {isRendering ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs">Rendering diagram...</span>
        </div>
      ) : (
        <div
          className="w-full flex justify-center overflow-x-auto py-1 [&>svg]:max-h-[380px] [&>svg]:w-auto [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  )
}
