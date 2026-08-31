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
  Layers, Sliders, Palette, RefreshCw, Copy, CheckCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

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
  calloutContent?: string
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
  { key: 'A4',    label: 'A4',      ratio: '210/297', badge: 'A4 PDF',    orientation: 'portrait',  note: 'A4 PDF export' },
]

// ─── Callout Configuration (MD -> Docs Enterprise Styles) ────────────────────
export const CALLOUT_CONFIG: Record<CalloutVariant, {
  label: string
  headerTitle: string
  icon: string
  color: string
  borderDark: string
  borderLight: string
  bgDark: string
  bgLight: string
  badgeBgDark: string
  badgeBgLight: string
  badgeTextDark: string
  badgeTextLight: string
}> = {
  note: {
    label: 'Note',
    headerTitle: 'Informational Notice',
    icon: 'ℹ️',
    color: '#3b82f6',
    borderDark: 'rgba(59, 130, 246, 0.45)',
    borderLight: '#93c5fd',
    bgDark: 'rgba(30, 58, 95, 0.45)',
    bgLight: '#eff6ff',
    badgeBgDark: 'rgba(59, 130, 246, 0.25)',
    badgeBgLight: '#dbeafe',
    badgeTextDark: '#93c5fd',
    badgeTextLight: '#1e40af',
  },
  important: {
    label: 'Important',
    headerTitle: 'Critical Action Required',
    icon: '🚨',
    color: '#ef4444',
    borderDark: 'rgba(239, 68, 68, 0.45)',
    borderLight: '#fca5a5',
    bgDark: 'rgba(69, 10, 10, 0.45)',
    bgLight: '#fef2f2',
    badgeBgDark: 'rgba(239, 68, 68, 0.25)',
    badgeBgLight: '#fee2e2',
    badgeTextDark: '#fca5a5',
    badgeTextLight: '#991b1b',
  },
  tip: {
    label: 'Pro Tip',
    headerTitle: 'Best Practice Recommendation',
    icon: '💡',
    color: '#10b981',
    borderDark: 'rgba(16, 185, 129, 0.45)',
    borderLight: '#6ee7b7',
    bgDark: 'rgba(6, 78, 59, 0.45)',
    bgLight: '#ecfdf5',
    badgeBgDark: 'rgba(16, 185, 129, 0.25)',
    badgeBgLight: '#d1fae5',
    badgeTextDark: '#6ee7b7',
    badgeTextLight: '#065f46',
  },
  warning: {
    label: 'Warning',
    headerTitle: 'Production Caution',
    icon: '⚠️',
    color: '#f59e0b',
    borderDark: 'rgba(245, 158, 11, 0.45)',
    borderLight: '#fcd34d',
    bgDark: 'rgba(69, 26, 3, 0.45)',
    bgLight: '#fffbeb',
    badgeBgDark: 'rgba(245, 158, 11, 0.25)',
    badgeBgLight: '#fef3c7',
    badgeTextDark: '#fcd34d',
    badgeTextLight: '#92400e',
  },
  info: {
    label: 'Reference',
    headerTitle: 'System & Architecture Details',
    icon: '📋',
    color: '#06b6d4',
    borderDark: 'rgba(6, 182, 212, 0.45)',
    borderLight: '#67e8f9',
    bgDark: 'rgba(8, 51, 68, 0.45)',
    bgLight: '#ecfeff',
    badgeBgDark: 'rgba(6, 182, 212, 0.25)',
    badgeBgLight: '#cffafe',
    badgeTextDark: '#67e8f9',
    badgeTextLight: '#155e75',
  },
  security: {
    label: 'Security & Compliance',
    headerTitle: 'Security Guardrail & Audit Requirement',
    icon: '🛡️',
    color: '#8b5cf6',
    borderDark: 'rgba(139, 92, 246, 0.45)',
    borderLight: '#c4b5fd',
    bgDark: 'rgba(46, 16, 101, 0.45)',
    bgLight: '#f5f3ff',
    badgeBgDark: 'rgba(139, 92, 246, 0.25)',
    badgeBgLight: '#ede9fe',
    badgeTextDark: '#c4b5fd',
    badgeTextLight: '#5b21b6',
  },
  architecture: {
    label: 'Architecture Review',
    headerTitle: 'System Reliability & Service Contract',
    icon: '🏗️',
    color: '#14b8a6',
    borderDark: 'rgba(20, 184, 166, 0.45)',
    borderLight: '#5eead4',
    bgDark: 'rgba(4, 47, 46, 0.45)',
    bgLight: '#f0fdfa',
    badgeBgDark: 'rgba(20, 184, 166, 0.25)',
    badgeBgLight: '#ccfbf1',
    badgeTextDark: '#5eead4',
    badgeTextLight: '#115e59',
  },
}

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

// ─── 30 Rich Per-Slide Templates ─────────────────────────────────────────────
export interface SlideTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'Basic' | 'Callouts & Notes' | 'Media & Visuals' | 'Data & Tables' | 'Code & Tech' | 'Lists & Process'
  markdown: string
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  // ── 1. Basic & Core (1–4) ──────────────────────────────────────────────────
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Completely clean slide to write anything from scratch',
    icon: '⬜',
    category: 'Basic',
    markdown: '## New Slide\n\nStart writing your ideas with Markdown...',
  },
  {
    id: 'title-hero',
    name: 'Title & Hero Subtitle',
    description: 'Bold presentation opener or keynote title slide',
    icon: '🎯',
    category: 'Basic',
    markdown: '# The Future of High-Velocity Engineering\n\nHow elite technical teams build, test, and ship mission-critical software at scale.',
  },
  {
    id: 'title-lead',
    name: 'Executive Summary',
    description: 'Heading with highlighted lead takeaway and context',
    icon: '📝',
    category: 'Basic',
    markdown: '## Executive Overview\n\nOur Q3 initiatives focused on **platform reliability**, reducing deploy times by **64%**, and scaling customer operations without increasing engineering overhead.\n\n- Accelerated release cycles from bi-weekly to continuous deploy\n- Maintained 99.99% system availability through peak traffic\n- Expanded enterprise multi-region redundancy',
  },
  {
    id: 'section-break',
    name: 'Section Break / Chapter',
    description: 'Clean visual transition divider between presentation parts',
    icon: '▬',
    category: 'Basic',
    markdown: '## Part 02\n\n> "Simplicity is prerequisite for reliability."\n\n### Scalable Infrastructure & Architecture Evolution',
  },

  // ── 2. Callouts & Notes (5–10) (MD -> Docs Enterprise Styles) ──────────────
  {
    id: 'callouts-pair',
    name: 'Note & Important Alert Stack',
    description: 'Paired information context card with critical warning notice',
    icon: '🚨',
    category: 'Callouts & Notes',
    markdown: '## Production Release Notice\n\n:::important\nDatabase schema migration v4.2 requires a 15-minute maintenance window at 02:00 UTC. Ensure all background workers are drained before deploying.\n:::\n\n:::note\nZero customer-facing downtime is expected for cached read requests through Edge CDN proxies.\n:::',
  },
  {
    id: 'enterprise-alerts',
    name: 'Enterprise Production Alerts',
    description: 'Triple alert stack: Architecture, Pro Tip, and Production Readiness',
    icon: '📋',
    category: 'Callouts & Notes',
    markdown: '## Enterprise Production Alerts & Notices\n\n:::architecture\n**Architecture Review Notice**: All microservices adhere to 12-Factor principles with stateless container execution and automated health checkpoints.\n:::\n\n:::tip\n**Pro Tip for Engineers**: Use distributed tracing with OpenTelemetry to trace latency across API Gateway and background tasks.\n:::\n\n:::warning\n**Production Readiness**: Zero-downtime rollback hooks must be validated before canary traffic hits 50%.\n:::',
  },
  {
    id: 'arch-notice',
    name: 'Architecture Review Card',
    description: 'Teal architecture contract and service-level requirements card',
    icon: '🏗️',
    category: 'Callouts & Notes',
    markdown: '## System Architecture Standards\n\n:::architecture\nAll API endpoints must return structured JSON errors with standardized trace IDs and adhere to strict p99 < 80ms latency SLAs.\n:::\n\n- Real-time gRPC streaming for internal worker communication\n- Read-replicas with automatic geographic DNS failover\n- Circuit-breaker patterns on external third-party integrations',
  },
  {
    id: 'security-card',
    name: 'Security & Compliance Card',
    description: 'Purple security guardrails with role-based access requirements',
    icon: '🛡️',
    category: 'Callouts & Notes',
    markdown: '## Security & Compliance Guardrails\n\n:::security\nNever hardcode credentials or API keys. Use AWS Secrets Manager or HashiCorp Vault with short-lived automatic rotation.\n:::\n\n- SOC2 Type II and ISO 27001 certified workflows\n- Mandatory mTLS for all inter-service cluster traffic\n- Automated static vulnerability scanning in CI/CD pipeline',
  },
  {
    id: 'pro-tips-card',
    name: 'Pro Tips & Best Practices',
    description: 'Emerald green best-practice advice card for teams',
    icon: '💡',
    category: 'Callouts & Notes',
    markdown: '## Engineering Best Practices\n\n:::tip\nAlways implement idempotent mutation endpoints with client-supplied UUID idempotency keys to prevent duplicate transaction executions.\n:::\n\n- Validate request schemas strictly at the API gateway layer\n- Set aggressive client connection timeouts on external HTTP calls\n- Log structured JSON with correlation identifiers',
  },
  {
    id: 'multi-notice-grid',
    name: 'Status & Action Matrix',
    description: 'Multi-variant notices highlighting status, action items, and tips',
    icon: '⚡',
    category: 'Callouts & Notes',
    markdown: '## Deployment Checklist Guidelines\n\n:::info\nStaging environment is automatically synced with production DB snapshots every 24 hours.\n:::\n\n:::important\nAudit logs must be retained for a minimum of 365 days in encrypted cold storage.\n:::\n\n:::tip\nRun load tests against the staging cluster using the provided k6 performance script.\n:::',
  },

  // ── 3. Media & Visuals (11–15) ─────────────────────────────────────────────
  {
    id: 'image-full',
    name: 'Full Visual Hero',
    description: 'High-impact full width image with subtitle caption',
    icon: '🖼️',
    category: 'Media & Visuals',
    markdown: '## Global Infrastructure Overview\n\n![Global Network Map|fit:cover|maxH:380|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)\n\n_24 edge regions deployed across North America, Europe, and Asia-Pacific._',
  },
  {
    id: 'image-caption',
    name: 'Analytics Dashboard & Stats',
    description: 'Dashboard screenshot with analytical insights underneath',
    icon: '📸',
    category: 'Media & Visuals',
    markdown: '## Real-time Telemetry Dashboard\n\n![Analytics Dashboard|fit:contain|maxH:320|align:center|w:90%|radius:md|shadow:true](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200)\n\n:::note\np99 latency dropped from 240ms to 42ms following Redis cluster sharding and query caching.\n:::',
  },
  {
    id: 'image-alert',
    name: 'Image + Critical Context',
    description: 'Visual diagram paired with an important alert and action step',
    icon: '🖼️',
    category: 'Media & Visuals',
    markdown: '## Network Traffic Distribution\n\n:::important\nTraffic spikes during Black Friday require pre-warming autoscaling groups 2 hours in advance.\n:::\n\n![Traffic Chart|fit:contain|maxH:300|align:center|w:100%|radius:md](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000)\n\n- Baseline capacity: 50,000 req/sec\n- Surge headroom: up to 300,000 req/sec',
  },
  {
    id: 'image-split',
    name: 'Split Image & Key Takeaways',
    description: 'Balanced visual representation alongside strategic bullet takeaways',
    icon: '🌗',
    category: 'Media & Visuals',
    markdown: '## Platform Experience Redesign\n\n![Mobile App Interface|fit:cover|maxH:280|align:center|w:85%|radius:lg|shadow:true](https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800)\n\n- **Unified Design System**: Reduced frontend bundle size by 35%\n- **Accessible First**: 100% WCAG 2.1 AA compliance score\n- **Sub-100ms Interactions**: Optimistic UI updates with offline cache support',
  },
  {
    id: 'image-gallery-3',
    name: 'Showcase Feature Banner',
    description: 'Showcase banner with high-resolution visual and key feature highlights',
    icon: '✨',
    category: 'Media & Visuals',
    markdown: '## Product Architecture Showcase\n\n![Modern Architecture Workspace|fit:cover|maxH:300|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200)\n\n:::tip\nModular workspaces allow cross-functional teams to independently iterate without cross-repo blockers.\n:::',
  },

  // ── 4. Data & Tables (16–20) ───────────────────────────────────────────────
  {
    id: 'metrics-3',
    name: '3 Headline KPI Numbers',
    description: 'Three high-level key performance metrics for leadership presentations',
    icon: '📈',
    category: 'Data & Tables',
    markdown: '## Q3 Business Performance\n\n| Metric | Value | QoQ Growth |\n| :--- | :--- | :--- |\n| **Annual Recurring Revenue** | **$18.4M** | 🟢 +42% YoY |\n| **Active Developers** | **142,000** | 🟢 +68% QoQ |\n| **Net Retention Rate** | **128%** | 🟢 Top Quartile |\n\n:::note\nCustomer acquisition cost (CAC) payback period decreased from 14 months to 8.5 months.\n:::',
  },
  {
    id: 'metrics-4',
    name: '4 Stat Performance Grid',
    description: 'System reliability and infrastructure KPI scorecard',
    icon: '📊',
    category: 'Data & Tables',
    markdown: '## Core Engineering KPIs\n\n| Core Indicator | Target | Current Actual | Status |\n| :--- | :--- | :--- | :--- |\n| **Availability SLA** | 99.95% | **99.992%** | ✅ Exceeding |\n| **p95 Latency** | < 120ms | **48ms** | ✅ Optimal |\n| **MTTR (Mean Time to Recover)** | < 15m | **4.2m** | ✅ Optimal |\n| **Build & Deploy Time** | < 10m | **3.8m** | ✅ Automated |',
  },
  {
    id: 'table-comparison',
    name: 'Feature & Plan Comparison',
    description: 'Comprehensive 3-column product tier comparison matrix',
    icon: '⚖️',
    category: 'Data & Tables',
    markdown: '## Tier Comparison Matrix\n\n| Feature | Starter Plan | Pro Plan | Enterprise Tier |\n| :--- | :--- | :--- | :--- |\n| **API Rate Limits** | 1,000 req/min | 20,000 req/min | **Unlimited Dedicated** |\n| **Data Retention** | 30 Days | 1 Year | **Custom / Forever** |\n| **SSO / SAML** | ❌ | ✅ Google/Okta | **Custom IdP + SCIM** |\n| **SLA Guarantee** | Best Effort | 99.9% | **99.99% with Penalties** |\n| **Support Channel** | Community | Slack Priority | **24/7 Phone & TAM** |',
  },
  {
    id: 'table-status',
    name: 'Roadmap & Feature Tracker',
    description: 'Clear initiative status table with owners and completion dates',
    icon: '✅',
    category: 'Data & Tables',
    markdown: '## Q4 Engineering Roadmap Status\n\n| Initiative | Target Milestone | DRI | Health |\n| :--- | :--- | :--- | :--- |\n| **Zero-Trust Auth v2** | Nov 15 | @sarah | 🟢 On Track |\n| **Postgres Partitioning** | Nov 28 | @alex | 🟡 In Review |\n| **Global Edge Caching** | Dec 10 | @michael | 🟢 In Progress |\n| **Kubernetes v1.30 Upgrade**| Dec 20 | @devops | 🟢 Planned |',
  },
  {
    id: 'table-formula',
    name: 'System Reliability & Formula Matrix',
    description: 'SLA calculations, throughput formulas, and performance limits',
    icon: '🧮',
    category: 'Data & Tables',
    markdown: '## System Reliability & Performance Formulas\n\n:::architecture\n**Availability Formula**: Availability = (MTBF / (MTBF + MTTR)) × 100%\n:::\n\n| Formula / Metric | Mathematical Expression | Target Benchmark |\n| :--- | :--- | :--- |\n| **Throughput Capacity** | $T = \\frac{N_{threads}}{\\Delta t_{response}}$ | > 15,000 req/sec |\n| **Availability Target** | $A = \\frac{Total - Downtime}{Total}$ | **99.99% (Four Nines)** |\n| **Little\'s Law** | $L = \\lambda \\times W$ | Queue depth < 50 |',
  },

  // ── 5. Code & Tech (21–25) ─────────────────────────────────────────────────
  {
    id: 'code-api',
    name: 'API Endpoint Implementation',
    description: 'TypeScript code snippet demonstrating client library integration',
    icon: '</>',
    category: 'Code & Tech',
    markdown: '## TypeScript SDK Client Usage\n\n```typescript\nimport { DeckEngine } from \'@deck/core\'\n\nconst engine = new DeckEngine({\n  apiKey: process.env.DECK_API_KEY,\n  environment: \'production\',\n  retries: 3,\n})\n\n// Render slide deck from markdown stream\nconst presentation = await engine.compileMarkdown(sourceMarkdown, {\n  aspectRatio: \'16:9\',\n  theme: \'dark\',\n})\n```',
  },
  {
    id: 'code-warning',
    name: 'Code + Critical Security Notice',
    description: 'Code sample paired with an important security warning alert',
    icon: '</>',
    category: 'Code & Tech',
    markdown: '## Secure Authentication Setup\n\n```typescript\nexport const authOptions = {\n  session: { strategy: "jwt", maxAge: 3600 },\n  providers: [\n    OAuthProvider({\n      clientId: process.env.AUTH_CLIENT_ID!,\n      clientSecret: process.env.AUTH_SECRET!,\n    }),\n  ],\n}\n```\n\n:::important\nEnsure `AUTH_SECRET` is generated via a cryptographically secure 256-bit random generator and rotated every quarter.\n:::',
  },
  {
    id: 'code-config-table',
    name: 'Config JSON + Parameter Table',
    description: 'Configuration file structure paired with property definitions table',
    icon: '📋',
    category: 'Code & Tech',
    markdown: '## Cluster Configuration Specs\n\n```json\n{\n  "cluster": "prod-us-east-1",\n  "replicas": { "min": 3, "max": 24 },\n  "autoscaling": { "targetCpuUtilization": 75 }\n}\n```\n\n| Property | Type | Default | Description |\n| :--- | :--- | :--- | :--- |\n| `replicas.min` | integer | `3` | Minimum healthy pods across availability zones |\n| `replicas.max` | integer | `20` | Max ceiling for automatic surge scaling |\n| `autoscaling.targetCpu` | integer | `70` | Average CPU threshold triggering pod scale-out |',
  },
  {
    id: 'mermaid-arch',
    name: 'System Architecture Diagram',
    description: 'Mermaid flowchart visualizing microservice and cloud data flow',
    icon: '🏗️',
    category: 'Code & Tech',
    markdown: '## Distributed Cloud Architecture\n\n```mermaid\ngraph LR\n  Client[Global Clients] -->|HTTPS / WSS| CDN[Cloudflare Edge]\n  CDN -->|Anycast| Gateway[Kong API Gateway]\n  Gateway -->|gRPC| Auth[Auth Service]\n  Gateway -->|gRPC| Core[Core Application Engine]\n  Core --> DB[(PostgreSQL Primary)]\n  Core --> Cache[(Redis Cluster)]\n  Core --> Kafka{{Kafka Event Stream}}\n```\n\n:::architecture\nDecoupled event streams ensure microservices process background tasks asynchronously.\n:::',
  },
  {
    id: 'mermaid-sequence',
    name: 'Sequence & Auth Flow',
    description: 'Mermaid sequence diagram illustrating authentication flow',
    icon: '🔄',
    category: 'Code & Tech',
    markdown: '## OAuth 2.0 PKCE Flow\n\n```mermaid\nsequenceDiagram\n  autonumber\n  actor User\n  participant Client as Web SPA\n  participant IdP as Identity Provider\n  participant API as API Gateway\n\n  User->>Client: Click Login\n  Client->>IdP: Authorize with Code Challenge\n  IdP-->>Client: Authorization Code\n  Client->>IdP: Exchange Code + Verifier\n  IdP-->>Client: JWT ID & Access Token\n  Client->>API: GET /api/v1/user (Bearer JWT)\n  API-->>Client: 200 OK (User Profile)\n```',
  },

  // ── 6. Lists & Process (26–30) ─────────────────────────────────────────────
  {
    id: 'checklist-launch',
    name: 'Production Launch Checklist',
    description: 'Interactive markdown checklist with completed and pending tasks',
    icon: '✔️',
    category: 'Lists & Process',
    markdown: '## Production Go-Live Checklist\n\n- [x] End-to-end integration tests passing (482/482)\n- [x] Load testing verified at 2.5× peak traffic volume\n- [x] Database indexes created and query planner verified\n- [x] Security audit penetration test signed off\n- [ ] DNS TTL lowered to 60 seconds\n- [ ] On-call engineer alerted in OpsGenie\n- [ ] Marketing release blog post queued',
  },
  {
    id: 'process-steps',
    name: '5-Step Implementation Guide',
    description: 'Numbered step-by-step workflow with concise instructions',
    icon: '1️⃣',
    category: 'Lists & Process',
    markdown: '## Deployment Pipeline Workflow\n\n1. **Code Validation**: Linting, formatting, and strict TypeScript compilation\n2. **Automated Unit Testing**: Parallel test execution across mock databases\n3. **Artifact Generation**: Multi-stage Docker build with zero vulnerability layers\n4. **Canary Rollout**: Initial 5% traffic deployment with real-time error monitoring\n5. **Full Promotion**: Automatic 100% traffic shift once p99 latencies stay normal',
  },
  {
    id: 'pros-cons',
    name: 'Architecture Trade-offs (Pros & Cons)',
    description: 'Balanced two-column comparison of technical trade-offs',
    icon: '⚖️',
    category: 'Lists & Process',
    markdown: '## Event-Driven Architecture Trade-offs\n\n**Key Advantages**\n\n- Loose coupling allows services to scale independently\n- Resilient against temporary downstream outages\n- Built-in audit trail through immutable event logs\n\n**Considerations & Challenges**\n\n- Eventual consistency requires careful UI state management\n- Distributed tracing requires unified correlation IDs\n- Debugging asynchronous event chains has higher complexity',
  },
  {
    id: 'timeline-quarters',
    name: 'Quarterly Strategic Milestones',
    description: 'Roadmap timeline detailing quarterly deliverables and achievements',
    icon: '🗓️',
    category: 'Lists & Process',
    markdown: '## Strategic Horizon 2026\n\n| Period | Strategic Pillar | Key Objective |\n| :--- | :--- | :--- |\n| **Q1 2026** | Enterprise Security | Automated SAML / SCIM & SOC2 Type II certification |\n| **Q2 2026** | Multi-Cloud Resilience | Automated disaster recovery across AWS & GCP |\n| **Q3 2026** | Edge Computing | Sub-10ms localized compute in 120+ global PoPs |\n| **Q4 2026** | AI Engine | Intelligent query optimization and automated indexing |',
  },
  {
    id: 'agenda-schedule',
    name: 'Meeting Agenda & Structure',
    description: 'Structured meeting timetable with time allocations and objectives',
    icon: '📅',
    category: 'Lists & Process',
    markdown: '## Executive Technical Briefing\n\n1. **Opening Context & Highlights** — _10 mins_ (Q3 Results & Metrics)\n2. **Architecture Modernization** — _20 mins_ (Microservices & Edge Migration)\n3. **Reliability & Security Posture** — _15 mins_ (Zero-Trust & SLA Compliance)\n4. **2026 Roadmap & Resource Allocation** — _15 mins_ (Key Investments)\n5. **Open Discussion & Q&A** — _15 mins_ (Stakeholder Alignment)',
  },
]

// ─── Callout Parser & Preprocessor ───────────────────────────────────────────
interface CalloutBlock {
  variant: CalloutVariant
  content: string
}

export function parseSlideSegments(body: string): Array<{ type: 'callout'; data: CalloutBlock } | { type: 'markdown'; data: string }> {
  const segments: Array<{ type: 'callout'; data: CalloutBlock } | { type: 'markdown'; data: string }> = []
  const lines = body.split('\n')
  let i = 0
  let mdBuffer = ''

  while (i < lines.length) {
    const line = lines[i]

    // 1. Check container directive: :::note, :::important, :::tip, :::warning, :::info, :::security, :::architecture
    const directiveMatch = line.match(/^:::(note|important|tip|warning|info|security|architecture|arch|caution|danger)\s*$/i)
    if (directiveMatch) {
      if (mdBuffer.trim()) { segments.push({ type: 'markdown', data: mdBuffer }); mdBuffer = '' }
      let rawVariant = directiveMatch[1].toLowerCase()
      if (rawVariant === 'arch') rawVariant = 'architecture'
      if (rawVariant === 'caution' || rawVariant === 'danger') rawVariant = 'warning'
      const variant = (rawVariant in CALLOUT_CONFIG ? rawVariant : 'note') as CalloutVariant
      const contentLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        contentLines.push(lines[i])
        i++
      }
      segments.push({ type: 'callout', data: { variant, content: contentLines.join('\n') } })
      i++
      continue
    }

    // 2. Check GitHub Alert syntax: > [!NOTE], > [!IMPORTANT], > [!WARNING], > [!TIP], > [!CAUTION]
    const ghAlertMatch = line.match(/^>\s*\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION|INFO|SECURITY)\]\s*$/i)
    if (ghAlertMatch) {
      if (mdBuffer.trim()) { segments.push({ type: 'markdown', data: mdBuffer }); mdBuffer = '' }
      let key = ghAlertMatch[1].toLowerCase()
      if (key === 'caution') key = 'warning'
      const variant = (key in CALLOUT_CONFIG ? key : 'note') as CalloutVariant
      const contentLines: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        contentLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      segments.push({ type: 'callout', data: { variant, content: contentLines.join('\n') } })
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
      segments.push({ type: 'callout', data: { variant, content: contentLines.join('\n') } })
      continue
    }

    mdBuffer += line + '\n'
    i++
  }

  if (mdBuffer.trim()) segments.push({ type: 'markdown', data: mdBuffer })
  return segments
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

  // Style 3: Modern Card Style
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
              calloutStyle={calloutStyle}
              isDark={isDark}
              onSelect={onSelect ? () => onSelect({ type: 'callout', calloutVariant: variant, calloutContent: content }) : undefined}
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
                  <div style={alignStyles}>
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
                  </div>
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
  slide: Slide
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
            {slide.title}
          </h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: `0 ${s(60)}px ${s(32)}px`, color: 'var(--color-muted-foreground)' }}>
          <SlideMarkdown
            body={slide.body}
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
  onClose,
}: InspectorProps) {
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

        {/* Global Callout Design Template */}
        <Section label="Callout Design Style">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: 'enterprise', label: 'Enterprise Docs' },
              { key: 'modern', label: 'Modern Card' },
              { key: 'accent', label: 'Left Accent' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onCalloutStyle(key as CalloutStyle)}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                  calloutStyle === key
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

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

        {/* Callout Inspector */}
        {selected.type === 'callout' && (
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
      <div className="flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95 duration-150 flex-col md:flex-row">
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
          <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto p-4 md:p-5">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onPick(t.markdown)
                  onClose()
                }}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
              >
                {/* Header Preview */}
                <div className="flex h-24 items-center justify-between px-4 bg-muted/40 border-b group-hover:bg-primary/5 transition-colors">
                  <span className="text-3xl">{t.icon}</span>
                  <Badge variant="outline" className="text-[10px] font-mono tracking-tight bg-background/80">
                    {t.category}
                  </Badge>
                </div>

                {/* Content Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                  <div className="mt-3 flex items-center text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to insert slide →
                  </div>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Search className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-semibold">No templates match &quot;{search}&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">Try another search keyword or select a category.</p>
                <button
                  onClick={() => {
                    setSelectedCat('All (30)')
                    setSearch('')
                  }}
                  className="mt-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
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
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setSlash(true)}>
                    <Zap className="mr-1 size-3 text-primary" />Inserts
                  </Button>
                </div>
              </div>

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

      {/* Deck Templates Modal (Full Presentation Load) */}
      {deckTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl border bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Deck Templates (Full Presentations)</h2>
                <p className="text-xs text-muted-foreground">Load a complete multi-slide presentation structure</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDeckTemplatesOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Executive Business Review', desc: 'Quarterly review with KPI metrics, status roadmap, and SLA targets' },
                { name: 'Architecture Technical Deep-Dive', desc: 'Mermaid microservice flows, sequence diagrams, and security notices' },
                { name: 'Product Launch & Showcase', desc: 'Feature comparison matrices, hero visual cards, and release checklist' },
                { name: 'Security & Compliance Briefing', desc: 'Zero-trust guardrails, SOC2 checklists, and audit notice cards' },
                { name: 'Developer Platform Strategy', desc: 'API SDK walkthroughs, code samples, and performance benchmarking' },
                { name: 'Startup Pitch & Growth Narrative', desc: 'Market insights, 3-metric KPI highlights, and vision statement' },
              ].map((tpl, i) => (
                <button
                  key={tpl.name}
                  onClick={() => {
                    setMarkdown(initialMarkdown)
                    setDeckTemplatesOpen(false)
                    notify(`Loaded ${tpl.name}`)
                  }}
                  className="group overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-lg p-4"
                >
                  <div className="flex h-16 items-center justify-between rounded-lg p-3 mb-3" style={{ background: `${accentHex[i % accentHex.length]}20` }}>
                    <LayoutTemplate className="size-5 text-primary" />
                    <span className="font-mono text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{tpl.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tpl.desc}</p>
                </button>
              ))}
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
