'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  GitBranch, X, Plus, FileText, RefreshCw, LogOut, Save, Search, ChevronLeft, ChevronRight,
  Lock, Globe, FolderTree, FileSearch, Check, AlertCircle, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UseGithubSync } from '@/lib/use-github-sync'

export function GithubPanel({
  open,
  onClose,
  markdown,
  deckTitle,
  onFileOpened,
  onFilesImported,
  onRequestSync,
  notify,
  github,
}: {
  open: boolean
  onClose: () => void
  markdown: string
  deckTitle: string
  onFileOpened: (path: string, content: string, sha: string) => void
  onFilesImported: (items: { path: string; content: string; sha: string }[]) => void
  onRequestSync: (path: string) => void
  notify: (msg: string) => void
  github: UseGithubSync
}) {
  const { user, repo, repoOptions, repoOptionsLoading, files, filesLoading, activeFile } = github

  const [signingIn, setSigningIn] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [fileSearch, setFileSearch] = useState('')
  const [newRepoName, setNewRepoName] = useState('')
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingRepo, setPickingRepo] = useState(false)
  const [mode, setMode] = useState<'choose' | 'browse' | 'single'>('choose')
  const [singlePath, setSinglePath] = useState('')
  const [openingSingle, setOpeningSingle] = useState(false)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const report = (kind: 'ok' | 'error', text: string) => {
    setStatus({ kind, text })
    notify(text)
    if (kind === 'ok') setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 1800)
  }

  useEffect(() => {
    if (open) {
      github.init()
      setStatus(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && user && !repo) {
      setPickingRepo(true)
      github.loadRepoOptions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, repo])

  // Land back on the mode chooser whenever a fresh repo is connected.
  useEffect(() => {
    if (repo) {
      setMode('choose')
      setSelectedPaths(new Set())
    }
  }, [repo?.fullName])

  useEffect(() => {
    if (!open) return
    if (activeFile) {
      setSaveFileName(activeFile.path)
      return
    }
    const slug = (deckTitle || 'presentation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    setSaveFileName(`decks/${slug || 'presentation'}.md`)
  }, [open, deckTitle, activeFile])

  const filteredRepos = useMemo(() => {
    const q = repoSearch.trim().toLowerCase()
    if (!q) return repoOptions
    return repoOptions.filter((r) => r.name.toLowerCase().includes(q))
  }, [repoOptions, repoSearch])

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase()
    if (!q) return files
    return files.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, fileSearch])

  const allFilteredSelected = filteredFiles.length > 0 && filteredFiles.every((f) => selectedPaths.has(f.path))

  if (!open) return null

  const StatusBanner = status && (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        status.kind === 'ok' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
      }`}
    >
      {status.kind === 'ok' ? <Check className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
      {status.text}
    </div>
  )

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      const ok = await github.signIn()
      if (ok) {
        await github.init()
        report('ok', 'Connected to GitHub')
      } else {
        report('error', 'GitHub sign-in was cancelled')
      }
    } finally {
      setSigningIn(false)
    }
  }

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return
    setCreatingRepo(true)
    try {
      const created = await github.createRepo(newRepoName.trim())
      report('ok', `Created and connected ${created.fullName}`)
      setNewRepoName('')
      setPickingRepo(false)
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Failed to create repository')
    } finally {
      setCreatingRepo(false)
    }
  }

  const handleSelectRepo = async (option: (typeof repoOptions)[number]) => {
    try {
      const connected = await github.selectRepo(option)
      report('ok', `Connected to ${connected.fullName}`)
      setPickingRepo(false)
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Failed to connect repository')
    }
  }

  const handleOpenFile = async (path: string) => {
    setOpeningPath(path)
    try {
      const { content, sha } = await github.openFile(path)
      onFileOpened(path, content, sha)
      report('ok', `Opened ${path} — loading into editor`)
      await new Promise((resolve) => setTimeout(resolve, 500))
      onClose()
    } catch (err) {
      report('error', err instanceof Error ? err.message : `Failed to open ${path}`)
    } finally {
      setOpeningPath(null)
    }
  }

  const handleOpenSingle = async () => {
    if (!singlePath.trim()) return
    setOpeningSingle(true)
    try {
      const path = singlePath.trim().replace(/^\/+/, '')
      const { content, sha } = await github.openFile(path)
      onFileOpened(path, content, sha)
      report('ok', `Opened ${path} — loading into editor`)
      await new Promise((resolve) => setTimeout(resolve, 500))
      onClose()
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Failed to open file')
    } finally {
      setOpeningSingle(false)
    }
  }

  const handleSave = async () => {
    if (!saveFileName.trim() || !repo) return
    const path = saveFileName.trim().replace(/^\/+/, '')

    // Overwriting a file we already know about goes through diff review instead
    // of saving straight away.
    if (activeFile?.path === path) {
      onRequestSync(path)
      return
    }

    setSaving(true)
    try {
      const sha = await github.saveFile(path, markdown)
      onFileOpened(path, markdown, sha)
      report('ok', `Saved ${path} to ${repo.fullName}`)
    } catch (err) {
      report('error', err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const toggleSelected = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    setSelectedPaths((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev)
        filteredFiles.forEach((f) => next.delete(f.path))
        return next
      }
      const next = new Set(prev)
      filteredFiles.forEach((f) => next.add(f.path))
      return next
    })
  }

  const handleImportSelected = async () => {
    if (selectedPaths.size === 0) return
    setImporting(true)
    const paths = Array.from(selectedPaths)
    const imported: { path: string; content: string; sha: string }[] = []
    try {
      for (const path of paths) {
        setOpeningPath(path)
        try {
          const { content, sha } = await github.openFile(path)
          imported.push({ path, content, sha })
        } catch {
          // keep going — report a partial-failure summary below
        }
      }
      if (imported.length > 0) onFilesImported(imported)
      const failed = paths.length - imported.length
      report(
        failed === 0 ? 'ok' : 'error',
        failed === 0
          ? `Imported ${imported.length} deck${imported.length === 1 ? '' : 's'} into My Decks`
          : `Imported ${imported.length} of ${paths.length} — ${failed} failed`
      )
      setSelectedPaths(new Set())
      if (imported.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600))
        onClose()
      }
    } finally {
      setOpeningPath(null)
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-5 bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GitBranch className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">GitHub Sync</h2>
              {repo && !pickingRepo ? (
                <p className="text-[11px] text-muted-foreground">{repo.fullName}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Store your decks as Markdown in one repository</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {user && repo && !pickingRepo && mode !== 'choose' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('choose')} className="h-8 gap-1 text-xs">
                <ChevronLeft className="size-3.5" /> Options
              </Button>
            )}
            {user && repo && !pickingRepo && (
              <Button variant="ghost" size="sm" onClick={() => { setPickingRepo(true); github.loadRepoOptions() }} className="h-8 gap-1.5 text-xs">
                Change repo
              </Button>
            )}
            {user && (
              <Button variant="ghost" size="sm" onClick={github.signOut} className="h-8 gap-1.5 text-xs">
                <LogOut className="size-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {user === undefined && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <RefreshCw className="mr-2 size-4 animate-spin" /> Checking sign-in status...
            </div>
          )}

          {user === null && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GitBranch className="size-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Connect your GitHub account</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  Sign in once, connect a repository, then open or sync any Markdown deck in it.
                </p>
              </div>
              <Button onClick={handleSignIn} disabled={signingIn} className="gap-2 font-semibold">
                {signingIn ? <RefreshCw className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
                Sign in with GitHub
              </Button>
            </div>
          )}

          {user && pickingRepo && (
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose a repository</p>
                {repo && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setPickingRepo(false)}>
                    <ChevronLeft className="size-3.5" /> Back
                  </Button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Search your repositories..."
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto rounded-lg border">
                {repoOptionsLoading && (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" /> Loading repositories...
                  </div>
                )}
                {!repoOptionsLoading && filteredRepos.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No repositories match.</div>
                )}
                {!repoOptionsLoading &&
                  filteredRepos.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelectRepo(option)}
                      className="group flex w-full items-center gap-2 border-b px-3 py-2.5 text-left text-xs last:border-b-0 hover:bg-muted"
                    >
                      {option.private ? <Lock className="size-3.5 text-muted-foreground" /> : <Globe className="size-3.5 text-muted-foreground" />}
                      <span className="flex-1 truncate font-medium text-foreground">{option.name}</span>
                      <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        Connect <ChevronRight className="size-3" />
                      </span>
                    </button>
                  ))}
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <Input
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="new-repo-name"
                  className="h-8 flex-1 text-xs"
                />
                <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold" disabled={creatingRepo || !newRepoName.trim()} onClick={handleCreateRepo}>
                  {creatingRepo ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Create
                </Button>
              </div>

              {StatusBanner}
            </div>
          )}

          {user && repo && !pickingRepo && mode === 'choose' && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How do you want to work with {repo.fullName}?</p>
              <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setMode('browse')}
                  className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <FolderTree className="size-6 text-primary" />
                  <span className="text-sm font-bold text-foreground">Browse entire repo</span>
                  <span className="text-[11px] text-muted-foreground">List every Markdown file in the repo, open one, or select several to import as decks</span>
                </button>
                <button
                  onClick={() => setMode('single')}
                  className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <FileSearch className="size-6 text-primary" />
                  <span className="text-sm font-bold text-foreground">Open one file</span>
                  <span className="text-[11px] text-muted-foreground">Type the exact path of a single Markdown file to open it directly</span>
                </button>
              </div>
            </div>
          )}

          {user && repo && !pickingRepo && mode === 'single' && (
            <div className="flex h-full flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open a file by path</p>
              <div className="flex items-center gap-2">
                <Input
                  value={singlePath}
                  onChange={(e) => setSinglePath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSingle()}
                  placeholder="decks/q4-review.md"
                  className="h-9 flex-1 text-xs font-mono"
                  autoFocus
                />
                <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold" disabled={openingSingle || !singlePath.trim()} onClick={handleOpenSingle}>
                  {openingSingle ? <RefreshCw className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
                  {openingSingle ? 'Opening...' : 'Open'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Path is relative to the repo root, e.g. <code className="font-mono">docs/deck.md</code>.</p>
              {StatusBanner}
            </div>
          )}

          {user && repo && !pickingRepo && mode === 'browse' && (
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search .md files in this repo..."
                    className="h-9 pl-8 text-xs"
                    autoFocus
                  />
                </div>
                {filteredFiles.length > 0 && (
                  <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs" onClick={toggleSelectAllFiltered}>
                    <div
                      className={`flex size-3.5 items-center justify-center rounded-sm border ${
                        allFilteredSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                      }`}
                    >
                      {allFilteredSelected && <Check className="size-2.5" />}
                    </div>
                    {allFilteredSelected ? 'Deselect all' : 'Select all'}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto rounded-lg border">
                {filesLoading && (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" /> Loading files...
                  </div>
                )}
                {!filesLoading && filteredFiles.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No Markdown files yet. Save your current deck below to create the first one.</div>
                )}
                {!filesLoading &&
                  filteredFiles.map((file) => {
                    const isOpening = openingPath === file.path
                    const isActive = activeFile?.path === file.path
                    const isSelected = selectedPaths.has(file.path)
                    return (
                      <div
                        key={file.path}
                        className={`group flex items-center gap-2 border-b px-3 py-2.5 text-xs font-mono last:border-b-0 hover:bg-muted ${
                          isActive ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSelected(file.path)}
                          disabled={openingPath !== null || importing}
                          className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border ${
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                          }`}
                          aria-label={isSelected ? `Deselect ${file.path}` : `Select ${file.path}`}
                        >
                          {isSelected && <Check className="size-2.5" />}
                        </button>
                        <FileText className="size-3.5 shrink-0 text-sky-500" />
                        <span className="flex-1 truncate">{file.path}</span>
                        {isOpening ? (
                          <span className="flex shrink-0 items-center gap-1 text-[11px] font-sans font-semibold text-primary">
                            <RefreshCw className="size-3 animate-spin" /> {importing ? 'Importing...' : 'Opening...'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenFile(file.path)}
                            disabled={openingPath !== null || importing}
                            className="flex shrink-0 items-center gap-0.5 text-[11px] font-sans font-semibold text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                          >
                            Open <ChevronRight className="size-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>

              {selectedPaths.size > 0 && (
                <Button
                  size="sm"
                  className="h-9 w-full gap-1.5 text-xs font-semibold"
                  disabled={importing}
                  onClick={handleImportSelected}
                >
                  {importing ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  {importing ? 'Importing...' : `Import ${selectedPaths.size} selected into My Decks`}
                </Button>
              )}

              {StatusBanner}

              <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <Input
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  placeholder="decks/deck.md"
                  className="h-8 flex-1 text-xs font-mono"
                />
                <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold" disabled={saving || !saveFileName.trim()} onClick={handleSave}>
                  {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {activeFile?.path === saveFileName.trim() ? 'Sync' : 'Save as new file'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
