'use client'

import { useCallback, useState } from 'react'

export interface GithubUser {
  login: string
  name: string | null
  avatarUrl: string
}

export interface GithubRepoRef {
  owner: string
  name: string
  fullName: string
  branch: string
}

export interface GithubRepoOption {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  default_branch: string
}

export interface GithubTreeFile {
  path: string
  sha: string
}

export interface ActiveGithubFile {
  path: string
  sha?: string
  /** Content as last fetched from / committed to GitHub — the diff baseline. */
  content: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null)
  return (data && typeof data.error === 'string' && data.error) || fallback
}

export function useGithubSync() {
  const [user, setUser] = useState<GithubUser | null | undefined>(undefined)
  const [repo, setRepo] = useState<GithubRepoRef | null | undefined>(undefined)
  const [repoOptions, setRepoOptions] = useState<GithubRepoOption[]>([])
  const [repoOptionsLoading, setRepoOptionsLoading] = useState(false)
  const [files, setFiles] = useState<GithubTreeFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [activeFile, setActiveFile] = useState<ActiveGithubFile | null>(null)

  const refreshFiles = useCallback(async (r: GithubRepoRef) => {
    setFilesLoading(true)
    try {
      const params = new URLSearchParams({ owner: r.owner, repo: r.name, branch: r.branch })
      const res = await fetch(`/api/github/tree?${params}`)
      if (!res.ok) throw new Error(await readError(res, 'Failed to list files'))
      const data = await res.json()
      setFiles(data.files ?? [])
    } finally {
      setFilesLoading(false)
    }
  }, [])

  const init = useCallback(async () => {
    const meRes = await fetch('/api/auth/me')
    const me = await meRes.json()
    setUser(me.user ?? null)
    if (!me.user) {
      setRepo(null)
      return
    }
    const repoRes = await fetch('/api/github/repo')
    const repoData = repoRes.ok ? await repoRes.json() : { repo: null }
    setRepo(repoData.repo ?? null)
    if (repoData.repo) refreshFiles(repoData.repo)
  }, [refreshFiles])

  const loadRepoOptions = useCallback(async () => {
    setRepoOptionsLoading(true)
    try {
      const res = await fetch('/api/github/repos')
      if (!res.ok) throw new Error(await readError(res, 'Failed to list repositories'))
      const data = await res.json()
      setRepoOptions(data.repos ?? [])
    } finally {
      setRepoOptionsLoading(false)
    }
  }, [])

  const signIn = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const popup = window.open('/api/auth/github', 'github-oauth', 'width=640,height=760')
      let settled = false
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (!event.data || event.data.type !== 'md2slides-github-auth') return
        settled = true
        window.removeEventListener('message', handleMessage)
        clearInterval(poll)
        resolve(Boolean(event.data.ok))
      }
      window.addEventListener('message', handleMessage)
      const poll = window.setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll)
          window.removeEventListener('message', handleMessage)
          if (!settled) resolve(false)
        }
      }, 400)
    })
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setRepo(null)
    setFiles([])
    setActiveFile(null)
  }, [])

  const selectRepo = useCallback(
    async (option: GithubRepoOption) => {
      const res = await fetch('/api/github/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: option.owner.login, name: option.name, branch: option.default_branch }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to connect repository'))
      const data = await res.json()
      setRepo(data.repo)
      setActiveFile(null)
      await refreshFiles(data.repo)
      return data.repo as GithubRepoRef
    },
    [refreshFiles]
  )

  const createRepo = useCallback(
    async (name: string) => {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, private: true }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to create repository'))
      const data = await res.json()
      const option: GithubRepoOption = {
        id: data.repo.id,
        name: data.repo.name,
        full_name: data.repo.full_name,
        owner: data.repo.owner,
        private: data.repo.private,
        default_branch: data.repo.default_branch,
      }
      return selectRepo(option)
    },
    [selectRepo]
  )

  const changeRepo = useCallback(async () => {
    await fetch('/api/github/repo', { method: 'DELETE' })
    setRepo(null)
    setFiles([])
    setActiveFile(null)
  }, [])

  const openFile = useCallback(
    async (path: string): Promise<{ content: string; sha: string }> => {
      if (!repo) throw new Error('No repository connected')
      const params = new URLSearchParams({ owner: repo.owner, repo: repo.name, contentPath: path })
      const res = await fetch(`/api/github/files?${params}`)
      if (!res.ok) throw new Error(await readError(res, 'Failed to open file'))
      const data = await res.json()
      const content = data.file.content as string
      const sha = data.file.sha as string
      setActiveFile({ path, sha, content })
      return { content, sha }
    },
    [repo]
  )

  // Fetches the current committed content for a path without disturbing activeFile —
  // used to build an accurate diff even if the in-memory baseline is stale.
  const fetchRemoteFile = useCallback(
    async (path: string): Promise<{ content: string; sha: string } | null> => {
      if (!repo) throw new Error('No repository connected')
      const params = new URLSearchParams({ owner: repo.owner, repo: repo.name, contentPath: path })
      const res = await fetch(`/api/github/files?${params}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(await readError(res, 'Failed to read file from GitHub'))
      const data = await res.json()
      return { content: data.file.content as string, sha: data.file.sha as string }
    },
    [repo]
  )

  const saveFile = useCallback(
    async (path: string, content: string, sha?: string) => {
      if (!repo) throw new Error('No repository connected')
      const res = await fetch('/api/github/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          path,
          content,
          sha: sha ?? (activeFile?.path === path ? activeFile.sha : undefined),
        }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to save file'))
      const data = await res.json()
      setActiveFile({ path, sha: data.sha, content })
      setFiles((prev) => (prev.some((f) => f.path === path) ? prev.map((f) => (f.path === path ? { path, sha: data.sha } : f)) : [...prev, { path, sha: data.sha }]))
      return data.sha as string
    },
    [repo, activeFile]
  )

  return {
    user,
    repo,
    repoOptions,
    repoOptionsLoading,
    files,
    filesLoading,
    activeFile,
    setActiveFile,
    init,
    signIn,
    signOut,
    selectRepo,
    createRepo,
    changeRepo,
    loadRepoOptions,
    openFile,
    fetchRemoteFile,
    saveFile,
  }
}

export type UseGithubSync = ReturnType<typeof useGithubSync>
