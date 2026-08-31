export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const topic = typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : 'Modern Software Engineering Platform'
    const slideCount = typeof body.slideCount === 'number' && body.slideCount >= 2 && body.slideCount <= 12 ? body.slideCount : 5
    const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Platform Architecture Team'

    const slides: string[] = []

    // Slide 1: Title & Hero Subtitle
    slides.push(`# ${topic}

Accelerating innovation, architecture scalability, and team velocity.

_${author} · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}_`)

    // Slide 2: Executive Summary & Highlights
    slides.push(`## Strategic Overview & Goals

Key drivers and measurable objectives for the next development horizon.

- **High-Velocity Core**: 3.5× faster deployment cycles with continuous validation
- **Zero-Downtime Reliability**: 99.99% availability SLA across global edge regions
- **Decoupled Architecture**: Modular microservices enabling parallel team execution

:::tip
Adopting standard Markdown workflows reduces authoring time by 75%.
:::`)

    // Slide 3: Architecture & System Diagram
    slides.push(`## Distributed Cloud Architecture

End-to-end telemetry, gateway orchestration, and persistent storage.

\`\`\`mermaid
graph LR
  Client[Global Clients] --> CDN[Cloudflare Edge]
  CDN --> Gateway[Kong API Gateway]
  Gateway --> ServiceA[Auth Service]
  Gateway --> ServiceB[Core Engine]
  ServiceB --> DB[(PostgreSQL)]
  ServiceB --> Cache[(Redis Cluster)]
\`\`\`

:::architecture
Decoupled event streams ensure microservices process background tasks asynchronously.
:::`)

    // Slide 4: Key Metrics & Performance Matrix
    if (slideCount >= 4) {
      slides.push(`## Performance Metrics & SLA Targets

Real-time telemetry benchmarking against production SLO targets.

| Core Metric | Baseline | Target Goal | Status |
| :--- | :--- | :--- | :--- |
| **p95 Latency** | 240ms | **42ms** | ✅ Optimal |
| **Availability SLA** | 99.9% | **99.99%** | 🟢 Exceeding |
| **Build & Test Time** | 12m | **3.5m** | 🟢 Automated |
| **Error Rate** | < 0.1% | **< 0.005%** | ✅ Nominal |

:::note
Optimizations verified under 3× peak production surge loads.
:::`)
    }

    // Slide 5: Security & Compliance Guardrails
    if (slideCount >= 5) {
      slides.push(`## Security & Compliance Posture

Zero-trust network architecture and strict compliance verification.

:::security
All microservices require mTLS encryption in transit and AES-256 at rest.
:::

:::important
Rotate production KMS credentials and API keys automatically every 90 days.
:::

- Automated vulnerability scanning in CI/CD pipeline
- SOC2 Type II and ISO 27001 continuous audit controls`)
    }

    // Slide 6: Execution Roadmap & Milestones
    if (slideCount >= 6) {
      slides.push(`## Next Phase Roadmap

Prioritized milestone execution across upcoming quarters.

- [x] Phase 1: Edge CDN migration & TLS 1.3 termination
- [x] Phase 2: Redis cluster sharding & query cache implementation
- [ ] Phase 3: Zero-trust microservice mesh rollout
- [ ] Phase 4: Automated canary deployments with instant rollback

:::tip
Canary rollouts evaluate error budgets in real time before promoting to 100% traffic.
:::`)
    }

    const markdown = slides.join('\n\n---\n\n')

    return Response.json({
      success: true,
      topic,
      slideCount: slides.length,
      markdown,
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request payload',
    }, { status: 500 })
  }
}
