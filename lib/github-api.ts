const GITHUB_API = 'https://api.github.com'

export class GithubApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function ghFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'md2slides-app',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new GithubApiError(`GitHub API ${path} failed: ${res.status} ${body}`, res.status)
  }
  return res
}

export interface GithubUser {
  login: string
  name: string | null
  avatar_url: string
}

export async function fetchGithubUser(token: string): Promise<GithubUser> {
  const res = await ghFetch(token, '/user')
  return res.json()
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  default_branch: string
}

export async function listRepos(token: string): Promise<GithubRepo[]> {
  const res = await ghFetch(token, '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator')
  return res.json()
}

export async function createRepo(token: string, name: string, isPrivate: boolean): Promise<GithubRepo> {
  const res = await ghFetch(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  })
  return res.json()
}

export interface GithubTreeFile {
  path: string
  sha: string
}

// Single call that returns every file in the repo (recursively), instead of
// walking directories one `contents` request at a time.
export async function listAllMarkdownFiles(token: string, owner: string, repo: string, branch: string): Promise<GithubTreeFile[]> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
  const data = await res.json()
  if (!Array.isArray(data.tree)) return []
  return data.tree
    .filter((item: { type: string; path: string }) => item.type === 'blob' && item.path.toLowerCase().endsWith('.md'))
    .map((item: { path: string; sha: string }) => ({ path: item.path, sha: item.sha }))
}

export async function getFileContent(token: string, owner: string, repo: string, path: string): Promise<{ content: string; sha: string }> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`)
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { content, sha: data.sha }
}

export async function putFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string }> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha,
    }),
  })
  const data = await res.json()
  return { sha: data.content.sha }
}
