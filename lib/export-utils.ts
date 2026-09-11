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
