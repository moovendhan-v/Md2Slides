// Builds the static frontend (app/out) consumed by the Tauri desktop shell.
// Next.js `output: 'export'` can't include server-only route handlers
// (app/api/**, app/llms.txt, app/llms-full.txt), so this script temporarily
// moves them out of the app directory, runs the export build, then restores
// them — the web/Cloudflare build is untouched.
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const appDir = path.join(root, 'app')
const stashDir = path.join(root, '.tauri-stash')

const serverOnlyPaths = ['api', 'llms.txt', 'llms-full.txt'].map((p) => path.join(appDir, p))

function stash() {
  rmSync(stashDir, { recursive: true, force: true })
  mkdirSync(stashDir, { recursive: true })
  for (const src of serverOnlyPaths) {
    if (!existsSync(src)) continue
    const dest = path.join(stashDir, path.basename(src))
    renameSync(src, dest)
  }
}

function restore() {
  for (const src of serverOnlyPaths) {
    const dest = path.join(stashDir, path.basename(src))
    if (existsSync(dest) && !existsSync(src)) {
      renameSync(dest, src)
    }
  }
  rmSync(stashDir, { recursive: true, force: true })
}

process.on('exit', restore)
process.on('SIGINT', () => process.exit(1))
process.on('SIGTERM', () => process.exit(1))

stash()
const result = spawnSync('npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, TAURI_BUILD: 'true' },
})
process.exit(result.status ?? 1)
