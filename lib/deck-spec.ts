// ─── Single Source of Truth for Md2Slide Presentation Engine & AI Specs ──────

export type CalloutVariant =
  | 'note'
  | 'important'
  | 'tip'
  | 'warning'
  | 'info'
  | 'security'
  | 'architecture'

export type CalloutStyle = 'enterprise' | 'modern' | 'accent' | 'glass'
export type ImgFit = 'contain' | 'cover' | 'fill'
export type ImgAlign = 'left' | 'center' | 'right'
export type ImgRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type RatioKey = '16:9' | '4:3' | '1:1' | '9:16' | '21:9'
export type Theme = 'dark' | 'light'

export interface CalloutConfigItem {
  icon: string
  label: string
  headerTitle: string
  color: string
  borderDark: string
  borderLight: string
  bgDark: string
  bgLight: string
  badgeBgDark: string
  badgeBgLight: string
  badgeTextDark: string
  badgeTextLight: string
  description: string
  syntaxExample: string
}

export const CALLOUT_CONFIG: Record<CalloutVariant, CalloutConfigItem> = {
  note: {
    icon: 'ℹ️',
    label: 'Note',
    headerTitle: 'Informational Notice',
    color: '#38bdf8',
    borderDark: 'rgba(56, 189, 248, 0.35)',
    borderLight: 'rgba(2, 132, 199, 0.4)',
    bgDark: 'rgba(56, 189, 248, 0.08)',
    bgLight: 'rgba(224, 242, 254, 0.65)',
    badgeBgDark: 'rgba(56, 189, 248, 0.2)',
    badgeBgLight: 'rgba(186, 230, 253, 0.8)',
    badgeTextDark: '#38bdf8',
    badgeTextLight: '#0369a1',
    description: 'Informational guidance, background context, or status notes.',
    syntaxExample: ':::note\np99 latency dropped from 240ms to 42ms following Redis caching.\n:::',
  },
  important: {
    icon: '🚨',
    label: 'Important',
    headerTitle: 'Critical Action Required',
    color: '#ef4444',
    borderDark: 'rgba(239, 68, 68, 0.45)',
    borderLight: 'rgba(220, 38, 38, 0.45)',
    bgDark: 'rgba(239, 68, 68, 0.1)',
    bgLight: 'rgba(254, 226, 226, 0.65)',
    badgeBgDark: 'rgba(239, 68, 68, 0.25)',
    badgeBgLight: 'rgba(254, 202, 202, 0.8)',
    badgeTextDark: '#f87171',
    badgeTextLight: '#b91c1c',
    description: 'High-priority actions, mandatory prerequisites, or critical warnings.',
    syntaxExample: ':::important\nRotate production KMS API keys every 90 days.\n:::',
  },
  tip: {
    icon: '💡',
    label: 'Pro Tip',
    headerTitle: 'Recommended Best Practice',
    color: '#10b981',
    borderDark: 'rgba(16, 185, 129, 0.35)',
    borderLight: 'rgba(5, 150, 105, 0.4)',
    bgDark: 'rgba(16, 185, 129, 0.08)',
    bgLight: 'rgba(209, 250, 229, 0.65)',
    badgeBgDark: 'rgba(16, 185, 129, 0.2)',
    badgeBgLight: 'rgba(167, 243, 208, 0.8)',
    badgeTextDark: '#34d399',
    badgeTextLight: '#047857',
    description: 'Helpful optimization tips, shortcuts, and recommended practices.',
    syntaxExample: ':::tip\nAlways supply UUID idempotency keys on mutation endpoints.\n:::',
  },
  warning: {
    icon: '⚠️',
    label: 'Warning',
    headerTitle: 'Operational Alert',
    color: '#f59e0b',
    borderDark: 'rgba(245, 158, 11, 0.4)',
    borderLight: 'rgba(217, 119, 6, 0.45)',
    bgDark: 'rgba(245, 158, 11, 0.09)',
    bgLight: 'rgba(254, 243, 199, 0.65)',
    badgeBgDark: 'rgba(245, 158, 11, 0.2)',
    badgeBgLight: 'rgba(253, 230, 138, 0.8)',
    badgeTextDark: '#fbbf24',
    badgeTextLight: '#b45309',
    description: 'Operational cautions, rate limit thresholds, or potential hazards.',
    syntaxExample: ':::warning\nSurge traffic may require scaling worker pods 2 hours in advance.\n:::',
  },
  info: {
    icon: '📌',
    label: 'Information',
    headerTitle: 'System & Architecture Detail',
    color: '#6366f1',
    borderDark: 'rgba(99, 102, 241, 0.35)',
    borderLight: 'rgba(79, 70, 229, 0.4)',
    bgDark: 'rgba(99, 102, 241, 0.08)',
    bgLight: 'rgba(224, 231, 255, 0.65)',
    badgeBgDark: 'rgba(99, 102, 241, 0.2)',
    badgeBgLight: 'rgba(199, 210, 254, 0.8)',
    badgeTextDark: '#818cf8',
    badgeTextLight: '#4338ca',
    description: 'General system notes, environment details, or reference specs.',
    syntaxExample: ':::info\nStaging databases automatically replicate from production snapshots daily.\n:::',
  },
  security: {
    icon: '🛡️',
    label: 'Security Notice',
    headerTitle: 'Compliance & Guardrails',
    color: '#a855f7',
    borderDark: 'rgba(168, 85, 247, 0.4)',
    borderLight: 'rgba(147, 51, 234, 0.45)',
    bgDark: 'rgba(168, 85, 247, 0.09)',
    bgLight: 'rgba(243, 232, 255, 0.65)',
    badgeBgDark: 'rgba(168, 85, 247, 0.22)',
    badgeBgLight: 'rgba(233, 213, 255, 0.8)',
    badgeTextDark: '#c084fc',
    badgeTextLight: '#7e22ce',
    description: 'Security policies, zero-trust rules, encryption standards, and compliance audits.',
    syntaxExample: ':::security\nmTLS is mandatory across all inter-cluster service traffic.\n:::',
  },
  architecture: {
    icon: '🏗️',
    label: 'Architecture Review',
    headerTitle: 'System Design & SLA Standards',
    color: '#14b8a6',
    borderDark: 'rgba(20, 184, 166, 0.4)',
    borderLight: 'rgba(13, 148, 136, 0.45)',
    bgDark: 'rgba(20, 184, 166, 0.09)',
    bgLight: 'rgba(204, 251, 241, 0.65)',
    badgeBgDark: 'rgba(20, 184, 166, 0.22)',
    badgeBgLight: 'rgba(153, 246, 228, 0.8)',
    badgeTextDark: '#2dd4bf',
    badgeTextLight: '#0f766e',
    description: 'Architecture decisions, distributed topology, sequence flows, and latency SLA contracts.',
    syntaxExample: ':::architecture\nDecoupled event streams ensure microservices process background tasks asynchronously.\n:::',
  },
}

export const CALLOUT_STYLES: Record<CalloutStyle, { name: string; description: string; syntaxSuffix: string }> = {
  enterprise: {
    name: 'Enterprise Docs',
    description: 'Standard docs style with colored header bar, uppercase title, category badge, and tinted container.',
    syntaxSuffix: ':::variant|style:enterprise',
  },
  modern: {
    name: 'Modern Card',
    description: 'Rounded card with floating icon square box, bold category label, and subtle glowing border.',
    syntaxSuffix: ':::variant|style:modern',
  },
  accent: {
    name: 'Left Accent',
    description: 'Sleek modern format with 4px colored vertical accent bar on the left edge and soft background fill.',
    syntaxSuffix: ':::variant|style:accent',
  },
  glass: {
    name: 'Glass Glow',
    description: 'Frosted glass with backdrop blur, circular glowing icon, and gradient border illumination.',
    syntaxSuffix: ':::variant|style:glass',
  },
}

export const IMAGE_SYNTAX_SPEC = {
  description: 'Extended Markdown image syntax with inline formatting parameters inside alt text or directive pipe.',
  pattern: '![Alt Text|fit:<fit>|maxH:<number>|align:<align>|w:<width>|radius:<radius>|shadow:<boolean>](image_url)',
  parameters: [
    { name: 'fit', type: 'contain | cover | fill', default: 'contain', desc: 'Object fit mode for scaling' },
    { name: 'maxH', type: 'number (100-560)', default: '320', desc: 'Maximum rendered height in pixels' },
    { name: 'align', type: 'left | center | right', default: 'center', desc: 'Horizontal alignment in slide container' },
    { name: 'w', type: '50% | 75% | 90% | 100%', default: '100%', desc: 'Width scale percentage' },
    { name: 'radius', type: 'none | sm | md | lg | full', default: 'md', desc: 'Corner border radius' },
    { name: 'shadow', type: 'true | false', default: 'false', desc: 'Elevation drop shadow effect' },
  ],
  example: '![Network Map|fit:cover|maxH:360|align:center|w:100%|radius:lg|shadow:true](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)',
}

export const RATIO_PRESETS_SPEC = [
  { key: '16:9', label: '16:9 Widescreen', desc: 'Standard widescreen display for modern presentations' },
  { key: '4:3', label: '4:3 Standard', desc: 'Classic projector aspect ratio' },
  { key: '1:1', label: '1:1 Square', desc: 'Social cards and square displays' },
  { key: '9:16', label: '9:16 Portrait Mobile', desc: 'Vertical mobile format for Stories & Reels' },
  { key: '21:9', label: '21:9 Ultrawide', desc: 'Cinematic ultrawide monitor format' },
]

export interface SlideTemplateItem {
  id: string
  name: string
  description: string
  icon: string
  category: 'Basic' | 'Callouts & Notes' | 'Media & Visuals' | 'Data & Tables' | 'Code & Tech' | 'Lists & Process'
  markdown: string
}

export const SLIDE_TEMPLATES_SPEC: SlideTemplateItem[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Completely clean slide to write any custom Markdown from scratch',
    icon: '📄',
    category: 'Basic',
    markdown: '## New Slide Title\n\nAdd your custom markdown content, images, callouts, or tables here.',
  },
  {
    id: 'title-hero',
    name: 'Title & Hero Subtitle',
    description: 'High-impact title slide with a compelling subtitle and metadata',
    icon: '✨',
    category: 'Basic',
    markdown: '# Executive Quarterly Review\n\nAccelerating Engineering Velocity & Cloud Infrastructure in Q4.\n\n_Presented by the Platform Team · November 2026_',
  },
  {
    id: 'section-header',
    name: 'Section Header / Divider',
    description: 'Bold divider slide to transition between major deck sections',
    icon: '🔖',
    category: 'Basic',
    markdown: '# 02 · System Architecture\n\nDeep-dive into distributed event streams, microservices, and edge reliability.',
  },
  {
    id: 'exec-summary',
    name: 'Executive Summary',
    description: 'Overview slide with key takeaways and business impact',
    icon: '📌',
    category: 'Basic',
    markdown: '## Executive Summary\n\n- **Record Velocity**: Delivered 14 major feature milestones on schedule\n- **Reliability Up**: 99.992% uptime maintained across all four quarters\n- **Cost Efficiency**: Optimized cloud infrastructure spend by 28% YoY\n\n:::tip\nContinuous profiling enabled pinpointing memory hotspots in real time.\n:::',
  },
  {
    id: 'two-col-bullets',
    name: 'Two Column Comparison',
    description: 'Side-by-side comparison of challenges and strategic solutions',
    icon: '⚖️',
    category: 'Basic',
    markdown: '## Strategic Comparison\n\n| Legacy Architecture | Cloud-Native Platform |\n| :--- | :--- |\n| Monolithic release cycle (6 weeks) | Continuous delivery (15 deploys/day) |\n| Single point of failure database | Multi-region distributed read replicas |\n| Manual scaling & alert fatigue | Automated horizontal autoscaling |',
  },
  {
    id: 'quote-hero',
    name: 'Customer & Vision Quote',
    description: 'Prominent blockquote with author attribution and company badge',
    icon: '💬',
    category: 'Basic',
    markdown: '## Leadership Vision\n\n> "Simplicity is prerequisite for reliability. By consolidating our slide workflows into standard Markdown, our teams ship faster and collaborate effortlessly."\n\n**— Alex Mercer**, VP of Engineering at CloudScale',
  },
  {
    id: 'note-card',
    name: 'Informational Notice Card',
    description: 'Blue informational callout card for guidance and operational notes',
    icon: 'ℹ️',
    category: 'Callouts & Notes',
    markdown: '## API Gateway Routing\n\n:::note\nAll ingress traffic routes through global Cloudflare Anycast edge before hitting internal cluster Envoy proxies.\n:::\n\n- Low latency TLS 1.3 termination at edge\n- Automated DDoS protection and rate limiting\n- Zero-trust token verification on every request',
  },
  {
    id: 'important-alert',
    name: 'Critical Action Alert',
    description: 'High-visibility red warning card for mandatory actions and breaking changes',
    icon: '🚨',
    category: 'Callouts & Notes',
    markdown: '## Breaking Changes & Migration Notice\n\n:::important\nLegacy v1 REST endpoints will be deprecated on December 31. All downstream consumers must migrate to v2 gRPC streams.\n:::\n\n1. Audit all internal SDK client versions\n2. Update authentication tokens to bearer JWT format\n3. Verify webhook receiver endpoint health',
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
    markdown: '## Distributed Cloud Architecture\n\n```mermaid\ngraph LR\n  Client[Global Clients] -->|HTTPS / WSS| CDN[Cloudflare Edge]\n  CDN -->|Anycast| Gateway[Kong API Gateway]\n  Gateway -->|gRPC| Auth[Auth Service]\n  Gateway -->|gRPC| Core[Core Application Engine]\n  Core --> DB[(PostgreSQL Primary)]\n  Core --> Cache[(Redis Cluster)]\n  Core --> Kafka{{Kafka Event Stream}}\n```\n\n:::architecture\nDecoupled event streams ensure microservices process background tasks asynchronously.\n:::\n',
  },
  {
    id: 'mermaid-sequence',
    name: 'Sequence & Auth Flow',
    description: 'Mermaid sequence diagram illustrating authentication flow',
    icon: '🔄',
    category: 'Code & Tech',
    markdown: '## OAuth 2.0 PKCE Flow\n\n```mermaid\nsequenceDiagram\n  autonumber\n  actor User\n  participant Client as Web SPA\n  participant IdP as Identity Provider\n  participant API as API Gateway\n\n  User->>Client: Click Login\n  Client->>IdP: Authorize with Code Challenge\n  IdP-->>Client: Authorization Code\n  Client->>IdP: Exchange Code + Verifier\n  IdP-->>Client: JWT ID & Access Token\n  Client->>API: GET /api/v1/user (Bearer JWT)\n  API-->>Client: 200 OK (User Profile)\n```',
  },
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

// ─── Dynamic LLMS.txt Generator (Single Source of Truth) ─────────────────────

export function generateLLMsTxt(): string {
  const calloutVariantsList = Object.entries(CALLOUT_CONFIG)
    .map(([k, v]) => `- \`:::${k}\` (${v.label}): ${v.description}`)
    .join('\n')

  const calloutStylesList = Object.entries(CALLOUT_STYLES)
    .map(([k, v]) => `- \`${k}\` (${v.name}): ${v.description} (Syntax: \`${v.syntaxSuffix}\`)`)
    .join('\n')

  const templateCategories = Array.from(new Set(SLIDE_TEMPLATES_SPEC.map((t) => t.category)))
    .map((cat) => {
      const items = SLIDE_TEMPLATES_SPEC.filter((t) => t.category === cat)
      return `### ${cat}\n` + items.map((t) => `- **${t.name}** (\`${t.id}\`): ${t.description}`).join('\n')
    })
    .join('\n\n')

  return `# Md2Slide — AI Presentation & Slide Generation Specification
> Dynamic machine-readable instructions and syntax rules for LLMs and AI Agents.
> Single Source of Truth generated dynamically from Md2Slide engine v2.0.

## Overview
Md2Slide transforms plain Markdown into executive-grade presentation slide decks.
Presentations are authored as a single Markdown document where slides are separated by the standard delimiter \`---\`.

## Core Syntax Rules

### 1. Slide Delimiters
Separate each slide using a triple-dash on its own line:
\`\`\`markdown
# First Slide Title
Content for first slide.

---

# Second Slide Title
Content for second slide.
\`\`\`

### 2. Slide Headers
- \`# Title\`: Renders as primary slide headline (bold, prominent scale).
- \`## Subtitle\`: Renders as slide section header.
- \`_Italic text_\`: Renders as caption / author metadata.

### 3. Enterprise Callout Notice Blocks
Wrap alerts in container directives:
\`\`\`markdown
:::variant
Callout body text or markdown lists.
:::
\`\`\`

Supported Callout Variants:
${calloutVariantsList}

Supported Callout Visual Styles:
${calloutStylesList}

### 4. Media & Image Formatting Syntax
Images support responsive inline parameters:
\`${IMAGE_SYNTAX_SPEC.pattern}\`

Parameters:
${IMAGE_SYNTAX_SPEC.parameters.map((p) => `- \`${p.name}\` (${p.type}, default: \`${p.default}\`): ${p.desc}`).join('\n')}

Example:
\`\`\`markdown
${IMAGE_SYNTAX_SPEC.example}
\`\`\`

### 5. Tables & KPI Scorecards
Standard GFM tables are styled as high-contrast presentation cards:
\`\`\`markdown
| Metric | Q2 Actual | Q3 Target | Status |
| :--- | :--- | :--- | :--- |
| **ARR** | **$18.4M** | **$20.0M** | 🟢 On Track |
| **p99 Latency** | **42ms** | < 50ms | ✅ Optimal |
\`\`\`

### 6. Code Fences & Diagrams
Fenced code blocks support syntax highlighting (\`typescript\`, \`json\`, \`bash\`) and Mermaid diagrams (\`mermaid\`):
\`\`\`markdown
\`\`\`mermaid
graph LR
  Client --> Edge[Cloudflare CDN]
  Edge --> API[Gateway]
  API --> DB[(Postgres)]
\`\`\`
\`\`\`

## Available Slide Templates (30 Layouts)
Use these template patterns when generating presentations:

${templateCategories}

## API Endpoints for AI Agents
- \`GET /llms.txt\`: This dynamic specification.
- \`GET /llms-full.txt\`: Full extended specification with full code samples of all 30 templates.
- \`GET /api/spec\`: JSON representation of all supported syntax, variants, and image parameters.
- \`GET /api/templates\`: JSON catalog of all 30 per-slide templates and 6 full deck presets.
- \`POST /api/generate-deck\`: AI generation endpoint (Accepts: \`{ topic: string, slidesCount?: number }\`).
- \`POST /api/validate-deck\`: Markdown validation and linting endpoint (Accepts: \`{ markdown: string }\`).
`
}

export function generateLLMsFullTxt(): string {
  const base = generateLLMsTxt()
  const allTemplatesCode = SLIDE_TEMPLATES_SPEC.map((t, i) => {
    return `### Template ${i + 1}: ${t.name} (\`${t.id}\` - Category: ${t.category})\n_${t.description}_\n\n\`\`\`markdown\n${t.markdown}\n\`\`\``
  }).join('\n\n---\n\n')

  return `${base}

## Full Slide Template Markdown Implementations

${allTemplatesCode}
`
}
