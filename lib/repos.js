/**
 * Private repository management for dsh-plugin-manager.
 *
 * The cloud side of this plugin is NOT a public plugin market — it is a
 * personal list of git repositories the user owns, installed with
 * `dsh plugin add <git spec>`. Access to private repositories depends on
 * the machine's git credentials (SSH keys, credential helper, or a token),
 * exactly as a normal `git clone` would.
 *
 * The saved list lives in <profile>/.dsh-plugin-manager/repos.json so the
 * same repositories are one click away after a restart.
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const REPOS_FILE = 'repos.json'

/** pnpm-style git sources: github:/gitlab:/bitbucket: owner/repo[#ref]. */
const PREFIX_SPEC_RE = /^(?:github|gitlab|bitbucket):[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#[A-Za-z0-9._/-]+)?$/

/** Full git URLs pnpm accepts: git+https://, git+ssh://, git+file://, git://. */
const GIT_URL_SPEC_RE = /^git\+(?:https|ssh|file):\/\/[^\s\u0000;|&`$]+(?:#[A-Za-z0-9._/-]+)?$/

/** scp-like ssh shorthand: git@host:owner/repo.git[#ref]. */
const SCP_SPEC_RE = /^git@[A-Za-z0-9_.:-]+:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/

/** A plain https github URL (optionally with .git and a #ref). */
const HTTPS_GITHUB_RE = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/

/** A plain https URL to any git host. */
const HTTPS_GIT_RE = /^https?:\/\/[^\s\u0000;|&`$]+(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/

/** Reject anything that could smuggle shell metacharacters into argv. */
function isSafe(text) {
  return typeof text === 'string' && text !== '' && !/[\u0000;|&`$]/.test(text)
}

/**
 * Normalize a user-supplied repository address into the pnpm git spec that
 * is handed to `dsh plugin add`. Returns { spec, label } or throws.
 */
export function normalizeRepoInput(input) {
  if (!isSafe(input)) throw new Error('Invalid repository address.')
  const raw = input.trim()
  if (raw === '') throw new Error('Repository address is empty.')

  let spec = raw
  let label = raw
  // Plain https://github.com/owner/repo → canonical git+https spec.
  if (HTTPS_GITHUB_RE.test(raw)) {
    const hash = raw.indexOf('#')
    const base = hash === -1 ? raw : raw.slice(0, hash)
    const ref = hash === -1 ? '' : raw.slice(hash)
    const withGit = base.endsWith('.git') ? base : `${base}.git`
    spec = `git+https://${withGit.slice('https://'.length)}${ref}`
    label = base.replace(/^https?:\/\//, '').replace(/\.git$/, '')
  } else if (SCP_SPEC_RE.test(raw)) {
    // git@host:owner/repo(.git)[#ref] → git+ssh://git@host/owner/repo.git#ref
    const hash = raw.indexOf('#')
    const base = hash === -1 ? raw : raw.slice(0, hash)
    const ref = hash === -1 ? '' : raw.slice(hash)
    const withGit = base.endsWith('.git') ? base : `${base}.git`
    spec = `git+ssh://${withGit.replace(':', '/')}${ref}`
    label = withGit.replace(/^git@/, '').replace(/\.git$/, '')
  } else if (HTTPS_GIT_RE.test(raw)) {
    // Any other https git URL: pass through, add git+ if missing.
    if (raw.startsWith('git+')) spec = raw
    else spec = `git+${raw}`
    label = raw.replace(/^https?:\/\//, '').replace(/\.git$/, '')
  } else if (PREFIX_SPEC_RE.test(raw) || GIT_URL_SPEC_RE.test(raw)) {
    spec = raw
    label = raw
  } else {
    throw new Error('Not a supported git repository address. Use https://…, git@host:…, github:owner/repo, or git+ssh://…')
  }
  return { spec, label }
}

/** A stored repository entry. */
export function createRepo(url, options = {}) {
  const normalized = normalizeRepoInput(url)
  const label = (typeof options.label === 'string' && options.label.trim() !== '')
    ? options.label.trim()
    : normalized.label
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    url: url.trim(),
    spec: normalized.spec,
    label,
    addedAt: Date.now(),
  }
}

/** The file holding the saved repository list. */
export function reposFilePath(profileDirectory) {
  return join(profileDirectory, '.dsh-plugin-manager', REPOS_FILE)
}

export async function loadRepos(profileDirectory) {
  try {
    const parsed = JSON.parse(await readFile(reposFilePath(profileDirectory), 'utf8'))
    if (Array.isArray(parsed.repos)) return parsed.repos
    return []
  } catch {
    return []
  }
}

export async function saveRepos(profileDirectory, repos) {
  const dir = join(profileDirectory, '.dsh-plugin-manager')
  await mkdir(dir, { recursive: true })
  const temporary = `${reposFilePath(profileDirectory)}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify({ repos }, null, 2), 'utf8')
  await rm(reposFilePath(profileDirectory), { force: true }).catch(() => undefined)
  await writeFile(reposFilePath(profileDirectory), JSON.stringify({ repos }, null, 2), 'utf8')
  await rm(temporary, { force: true }).catch(() => undefined)
  return repos
}

/** Add a repository; rejects duplicates by normalized spec. */
export async function addRepo(profileDirectory, url, options = {}) {
  const repos = await loadRepos(profileDirectory)
  const entry = createRepo(url, options)
  if (repos.some((repo) => repo.spec === entry.spec)) {
    throw new Error(`Repository already saved: ${entry.spec}`)
  }
  const next = [...repos, entry]
  await saveRepos(profileDirectory, next)
  return entry
}

/** Remove a repository by id (or by url/spec). */
export async function removeRepo(profileDirectory, idOrUrl) {
  const repos = await loadRepos(profileDirectory)
  const next = repos.filter(
    (repo) => repo.id !== idOrUrl && repo.url !== idOrUrl && repo.spec !== idOrUrl
  )
  if (next.length === repos.length) {
    throw new Error('Repository not found.')
  }
  await saveRepos(profileDirectory, next)
  return next
}

/** True when a string is a valid install spec for the generic install route. */
export function isRepoSpec(spec) {
  if (!isSafe(spec)) return false
  const raw = spec.trim()
  return PREFIX_SPEC_RE.test(raw) || GIT_URL_SPEC_RE.test(raw) || SCP_SPEC_RE.test(raw)
}
