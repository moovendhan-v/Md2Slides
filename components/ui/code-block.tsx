'use client'

import React, { useState, useMemo } from 'react'
import { Check, Copy, Terminal, FileCode } from 'lucide-react'

interface CodeBlockProps {
  code: string
  className?: string
  fontScale?: number
  isDark?: boolean
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}

export function CodeBlock({
  code,
  className = '',
  fontScale = 1,
  isDark = true,
  onClick,
  style,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  // Extract language from className (e.g., 'language-typescript' -> 'typescript')
  const language = useMemo(() => {
    const match = /language-(\w+)/.exec(className || '')
    return match ? match[1].toLowerCase() : ''
  }, [className])

  const isDiff = language === 'diff' || code.includes('\n+') || code.includes('\n-')

  const lines = useMemo(() => {
    return code.replace(/\n$/, '').split('\n')
  }, [code])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = (base: number) => Math.round(base * fontScale)

  // Language display labels
  const langLabel = useMemo(() => {
    switch (language) {
      case 'ts':
      case 'typescript':
        return 'TypeScript'
      case 'js':
      case 'javascript':
        return 'JavaScript'
      case 'py':
      case 'python':
        return 'Python'
      case 'rs':
      case 'rust':
        return 'Rust'
      case 'go':
        return 'Go'
      case 'diff':
        return 'Git Diff'
      case 'sql':
        return 'SQL'
      case 'json':
        return 'JSON'
      case 'sh':
      case 'bash':
      case 'shell':
        return 'Bash'
      case 'yaml':
      case 'yml':
        return 'YAML'
      default:
        return language ? language.toUpperCase() : 'CODE'
    }
  }, [language])

  return (
    <div
      onClick={onClick}
      className="group relative my-3 overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-md backdrop-blur-md transition-all hover:border-primary/40"
      style={{
        marginBottom: `${s(14)}px`,
        ...style,
      }}
    >
      {/* Code Header Bar */}
      <div className="flex h-9 items-center justify-between border-b border-border/50 bg-muted/40 px-3.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-mono">
          <div className="flex gap-1.5 opacity-60">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-2 inline-flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-primary border border-border/50">
            {language === 'diff' ? <Terminal className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
            {langLabel}
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCopy(e as any)
            }
          }}
          className="flex h-6 cursor-pointer select-none items-center gap-1 rounded border border-border bg-background/80 px-2 text-[11px] font-medium text-foreground transition-all hover:bg-muted"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </div>
      </div>

      {/* Code Body */}
      <div
        className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed"
        style={{
          fontSize: `${s(13)}px`,
          lineHeight: 1.65,
        }}
      >
        {isDiff ? (
          <div className="flex flex-col">
            {lines.map((line, idx) => {
              const isAddition = line.startsWith('+')
              const isDeletion = line.startsWith('-')
              const isInfo = line.startsWith('@@') || line.startsWith('diff')

              let rowBg = 'transparent'
              let textColor = isDark ? '#e2e8f0' : '#1e293b'
              let prefixColor = 'var(--color-muted-foreground)'

              if (isAddition) {
                rowBg = isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.15)'
                textColor = isDark ? '#34d399' : '#047857'
                prefixColor = '#10b981'
              } else if (isDeletion) {
                rowBg = isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.15)'
                textColor = isDark ? '#f87171' : '#b91c1c'
                prefixColor = '#ef4444'
              } else if (isInfo) {
                textColor = '#38bdf8'
              }

              return (
                <div
                  key={idx}
                  className="flex items-center px-2 py-0.5 rounded-sm transition-colors"
                  style={{
                    backgroundColor: rowBg,
                    color: textColor,
                  }}
                >
                  <span
                    className="w-7 select-none pr-3 text-right text-[11px] opacity-40"
                    style={{ color: prefixColor }}
                  >
                    {idx + 1}
                  </span>
                  <span className="w-4 select-none font-bold" style={{ color: prefixColor }}>
                    {isAddition ? '+' : isDeletion ? '-' : ' '}
                  </span>
                  <span className="flex-1 whitespace-pre">
                    {isAddition || isDeletion ? line.slice(1) : line}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <pre className="whitespace-pre font-mono">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
