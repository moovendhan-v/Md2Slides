// ─── Export & Sharing Utilities for Md2Slides ─────────────────────────────

/**
 * Encodes markdown text into URL-safe base64 string
 */
export function encodeDeckToHash(markdown: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(markdown)
    let binary = ''
    utf8Bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return btoa(binary)
  } catch (err) {
    console.error('Failed to encode deck hash:', err)
    return ''
  }
}

/**
 * Decodes markdown text from URL-safe base64 string
 */
export function decodeDeckFromHash(hash: string): string | null {
  try {
    const cleanHash = hash.replace(/^#deck=/, '').replace(/^#/, '')
    if (!cleanHash) return null
    const binary = atob(cleanHash)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch (err) {
    console.error('Failed to decode deck hash:', err)
    return null
  }
}

/**
 * Extracts speaker notes from raw markdown slide comments
 * Matches `<!-- note: ... -->` or `<!-- notes: ... -->` or `<!-- speaker: ... -->`
 */
export function extractSpeakerNotes(rawSlide: string): { cleanBody: string; notes: string } {
  const noteRegex = /<!--\s*(?:notes?|speaker):\s*([\s\S]*?)\s*-->/gi
  const notesList: string[] = []

  let cleanBody = rawSlide.replace(noteRegex, (_, noteContent) => {
    notesList.push(noteContent.trim())
    return ''
  })

  return {
    cleanBody: cleanBody.trim(),
    notes: notesList.join('\n\n'),
  }
}

/**
 * Generates a self-contained, standalone offline HTML presentation
 */
export function generateStandaloneHtml(title: string, slides: Array<{ title: string; body: string }>, theme: 'dark' | 'light'): string {
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#090d16' : '#f8fafc'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const slidesJson = JSON.stringify(slides)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Presentation'} - Md2Slides</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: ${bgColor};
      color: ${textColor};
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      border-bottom: 1px solid ${cardBorder};
      font-size: 14px;
      font-weight: 600;
    }
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      position: relative;
    }
    .slide-card {
      width: 100%;
      max-width: 1000px;
      aspect-ratio: 16/9;
      background: ${cardBg};
      border: 1px solid ${cardBorder};
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow-y: auto;
    }
    .slide-card h1 { font-size: 36px; font-weight: 800; margin-bottom: 16px; color: #38bdf8; }
    .slide-card h2 { font-size: 28px; font-weight: 700; margin-bottom: 14px; }
    .slide-card p { font-size: 18px; line-height: 1.6; margin-bottom: 14px; }
    .slide-card ul, .slide-card ol { margin-left: 28px; margin-bottom: 14px; font-size: 18px; line-height: 1.6; }
    .slide-card pre { background: rgba(0,0,0,0.3); border: 1px solid ${cardBorder}; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; overflow-x: auto; margin-bottom: 14px; }
    .slide-card table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .slide-card th, .slide-card td { border: 1px solid ${cardBorder}; padding: 10px 14px; text-align: left; }
    .slide-card th { background: rgba(255,255,255,0.05); font-weight: 700; }
    footer {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      align-items: center;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      padding: 8px 18px;
      border-radius: 999px;
      border: 1px solid ${cardBorder};
    }
    button {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover { background: rgba(255,255,255,0.2); }
    .counter { font-family: monospace; font-size: 14px; min-width: 60px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <span>${title || 'Presentation'}</span>
    <span style="opacity: 0.6; font-size: 12px;">Standalone Offline Bundle · Md2Slides</span>
  </header>
  <main>
    <div id="slide-content" class="slide-card"></div>
    <footer>
      <button onclick="prevSlide()">← Prev</button>
      <span id="counter" class="counter">1 / 1</span>
      <button onclick="nextSlide()">Next →</button>
      <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
    </footer>
  </main>

  <script>
    const slides = ${slidesJson};
    let currentIndex = 0;

    mermaid.initialize({ startOnLoad: false, theme: '${isDark ? 'dark' : 'default'}' });

    function renderSlide() {
      const slide = slides[currentIndex];
      const container = document.getElementById('slide-content');
      document.getElementById('counter').innerText = (currentIndex + 1) + ' / ' + slides.length;
      
      const rawHtml = marked.parse(slide.body || '');
      container.innerHTML = rawHtml;

      // Render any mermaid charts
      const codeBlocks = container.querySelectorAll('code.language-mermaid, pre code');
      codeBlocks.forEach((block, idx) => {
        if (block.textContent.trim().startsWith('graph') || block.textContent.trim().startsWith('sequenceDiagram')) {
          const mDiv = document.createElement('div');
          mDiv.className = 'mermaid';
          mDiv.textContent = block.textContent.trim();
          block.parentElement.replaceWith(mDiv);
        }
      });
      mermaid.run();
    }

    function prevSlide() {
      if (currentIndex > 0) {
        currentIndex--;
        renderSlide();
      }
    }

    function nextSlide() {
      if (currentIndex < slides.length - 1) {
        currentIndex++;
        renderSlide();
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'f') toggleFullscreen();
    });

    renderSlide();
  </script>
</body>
</html>`
}

/**
 * Generates a print-optimized HTML page — one slide per printed page — and
 * triggers the browser's print dialog once rendering (incl. Mermaid) settles,
 * so the user can "Save as PDF" from there. Client-side only; no server or
 * headless-browser dependency needed.
 */
export function generatePrintableHtml(
  title: string,
  slides: Array<{ title: string; body: string }>,
  theme: 'dark' | 'light',
  ratio: string
): string {
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#0b0f19' : '#ffffff'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
  const codeBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'

  const [rw, rh] = ratio.split('/').map(Number)
  const pageWidthIn = 11
  const pageHeightIn = Number((pageWidthIn * ((rh || 9) / (rw || 16))).toFixed(3))

  const slidesHtml = slides.map((_, i) => `<section class="slide"><div class="slide-inner" data-body="${i}"></div></section>`).join('\n')
  const bodiesJson = JSON.stringify(slides.map((s) => s.body))

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title || 'Presentation'}</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<style>
  @page { size: ${pageWidthIn}in ${pageHeightIn}in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${bgColor}; color: ${textColor}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .slide {
    width: ${pageWidthIn}in; height: ${pageHeightIn}in;
    padding: 0.55in 0.85in;
    page-break-after: always; break-after: page;
    display: flex; flex-direction: column; justify-content: center;
    overflow: hidden;
  }
  .slide:last-child { page-break-after: auto; }
  .slide-inner h1 { font-size: 32px; font-weight: 800; margin: 0 0 16px; color: #38bdf8; }
  .slide-inner h2 { font-size: 25px; font-weight: 700; margin: 0 0 14px; }
  .slide-inner h3 { font-size: 19px; font-weight: 700; margin: 0 0 12px; }
  .slide-inner p { font-size: 15px; line-height: 1.6; margin: 0 0 12px; }
  .slide-inner ul, .slide-inner ol { margin: 0 0 12px 24px; font-size: 15px; line-height: 1.6; }
  .slide-inner pre { background: ${codeBg}; border: 1px solid ${cardBorder}; padding: 12px; border-radius: 8px; font-family: "JetBrains Mono", Menlo, monospace; font-size: 11px; overflow: hidden; margin: 0 0 12px; }
  .slide-inner table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 13px; }
  .slide-inner th, .slide-inner td { border: 1px solid ${cardBorder}; padding: 8px 10px; text-align: left; }
  .slide-inner th { background: ${codeBg}; font-weight: 700; }
  .slide-inner img { max-width: 100%; }
  .slide-inner blockquote { border-left: 3px solid ${cardBorder}; margin: 0 0 12px; padding: 4px 14px; opacity: 0.85; }
  @media screen {
    body { background: #333; padding: 24px 0; }
    .slide { margin: 0 auto 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  }
</style>
</head>
<body>
${slidesHtml}
<script>
  const bodies = ${bodiesJson};
  mermaid.initialize({ startOnLoad: false, theme: '${isDark ? 'dark' : 'default'}' });

  bodies.forEach((body, i) => {
    const el = document.querySelector('[data-body="' + i + '"]');
    el.innerHTML = marked.parse(body || '');
    el.querySelectorAll('pre code').forEach((block) => {
      const text = block.textContent.trim();
      if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|journey|timeline)/.test(text)) {
        const mDiv = document.createElement('div');
        mDiv.className = 'mermaid';
        mDiv.textContent = text;
        block.parentElement.replaceWith(mDiv);
      }
    });
  });

  Promise.resolve(mermaid.run()).finally(() => {
    setTimeout(() => window.print(), 350);
  });
</script>
</body>
</html>`
}
