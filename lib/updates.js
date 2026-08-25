/**
 * Update checks for installed plugins.
 *
 * For every community dependency of the profile we decide where its
 * updates live and compare against the installed version:
 *   - npm registry specs (bare name or name@range) hit
 *     https://registry.npmjs.org/<name>/latest and compare versions;
 *   - git specs (git+https/ssh/file, github:/gitlab:/bitbucket:, scp)
 *     compare the commit recorded in pnpm-lock.yaml against `git
 *     ls-remote` on the same URL — best effort: private repositories
 *     without machine credentials are reported as "unknown", never as
 *     out of date;
 *   - local sources (file:/link:, absolute paths) have no remote to
 *     compare and are skipped.
 *
 * Results are cached in <profile>/.dsh-plugin-manager/updates.json for an
 * hour so opening the settings page does not hammer the registry. A force
 * refresh bypasses the cache (the UI "check for updates" button).
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { NPM_SPEC_RE } from './validate.js'
import { readInstalled } from './profile.js'

const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org'
const CACHE_TTL_MS = 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 8_000
const UPDATES_FILE = 'updates.json'

const GIT_PREFIX_RE = /^(?:github|gitlab|bitbucket):[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#[A-Za-z0-9._/-]+)?$/

/**
 * A dependency value that is only a version range or dist-tag (the package
 * name lives in the manifest key, e.g. "dsh-dream-skin": "^0.4.11"). Treat
 * it as an npm-registry dependency named after the manifest key.
 */
const VERSION_OR_TAG_RE =
  /^[~^]?(?:[0-9]+(?:\.[0-9x]+)*(?:[-+][0-9A-Za-z.-]+)?|[A-Za-z][0-9A-Za-z.-]*)$/
const GIT_URL_RE = /^git\+(?:https|ssh|file):\/\/[^\s\u0000;|&`$]+(?:#[A-Za-z0-9._/-]+)?$/
const GIT_SCP_RE = /^git@[A-Za-z0-9_.:-]+:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/

/** Which remote (if any) a dependency spec updates from. */
export function classifySpec(spec) {
  if (typeof spec !== 'string' || spec === '') return 'unknown'
  if (NPM_SPEC_RE.test(spec)) return 'npm'
  if (GIT_PREFIX_RE.test(spec) || GIT_URL_RE.test(spec) || GIT_SCP_RE.test(spec)) return 'git'
  if (spec.startsWith('file:') || spec.startsWith('link:') || spec.startsWith('/')) return 'local'
  return 'unknown'
}

/** The npm package name of an npm spec (version suffix stripped). */
export function npmNameOf(spec) {
  const at = spec.lastIndexOf('@')
  if (at > 0) return spec.slice(0, at)
  return spec
}

/**
 * Resolve the npm package name a manifest entry updates from: the name baked
 * into an npm spec (dsh-x@^1.0.0), or the manifest key itself when the
 * dependency value is only a version range / dist-tag. Undefined for git,
 * local and unrecognized sources.
 */
export function npmTargetOf(plugin) {
  // A dependency value that is only a version range or dist-tag names the
  // manifest key, not a package name — "dsh-dream-skin": "0.4.11" must check
  // the registry for dsh-dream-skin, never for "0.4.11".
  if (VERSION_OR_TAG_RE.test(plugin.spec)) return plugin.name
  const kind = classifySpec(plugin.spec)
  if (kind === 'npm') return npmNameOf(plugin.spec)
  return undefined
}

/** Strip a leading scoped-name path into the registry path form. */
export function registryPath(name) {
  return name.replace('/', '%2f')
}

/**
 * The npm registry to query: honour the environment the same way pnpm does
 * (npm_config_registry), falling back to the public registry. The profile's
 * own .npmrc is not read here — the host process environment already carries
 * the npm config the user's machine was launched with.
 */
export function configuredRegistry(env = process.env) {
  const value = env.npm_config_registry ?? env.NPM_CONFIG_REGISTRY
  if (typeof value === 'string' && value !== '') {
    return value.replace(/\/+$/, '')
  }
  return DEFAULT_NPM_REGISTRY
}

/**
 * Query the npm registry for the latest version of a package, reading the
 * full document's dist-tags (the most stable field across registries and
 * mirrors). Returns undefined when the registry cannot be reached.
 */
export async function checkNpmUpdate(name, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const base = options.registry ?? configuredRegistry()
  const url = `${base}/${registryPath(name)}`
  let response
  try {
    response = await fetchImpl(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    })
  } catch (error) {
    console.error(`[dsh-plugin-manager] npm check fetch failed for ${name}: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
  if (!response.ok) {
    console.error(`[dsh-plugin-manager] npm check HTTP ${response.status} for ${name} (${url})`)
    return undefined
  }
  try {
    const body = await response.json()
    const latest = body?.['dist-tags']?.latest ?? body?.version
    if (latest === undefined) {
      console.error(`[dsh-plugin-manager] npm check: no dist-tags/version in response for ${name} (${url})`)
    }
    return typeof latest === 'string' ? latest : undefined
  } catch {
    return undefined
  }
}

/** The ref fragment of a git spec (after #), or HEAD when absent. */
export function gitRefOf(spec) {
  const hash = spec.indexOf('#')
  if (hash === -1) return 'HEAD'
  const ref = spec.slice(hash + 1)
  return ref.startsWith('semver:') ? 'HEAD' : ref
}

/** The repository URL of a git spec (without any #ref). */
export function gitUrlOf(spec) {
  const hash = spec.indexOf('#')
  return hash === -1 ? spec : spec.slice(0, hash)
}

/** A git URL git itself can clone (the git+ protocol prefix is pnpm syntax). */
export function gitCloneUrl(spec) {
  return gitUrlOf(spec).replace(/^git\+/, '')
}

/**
 * Current commit of a git spec via `git ls-remote`, or undefined.
 * Fails (undefined) for private repositories the machine cannot read.
 */
export function gitHeadCommit(spec, options = {}) {
  const url = gitCloneUrl(spec)
  const ref = gitRefOf(spec)
  const result = (options.spawnSync ?? spawnSync)('git', ['ls-remote', url, ref], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: options.timeoutMs ?? 15_000,
    encoding: 'utf8',
  })
  if (result.status !== 0) return undefined
  const match = /^([0-9a-f]{7,40})[\s\t]/m.exec(result.stdout ?? '')
  return match === null ? undefined : match[1]
}

/**
 * The resolved commit of a git-installed package from pnpm-lock.yaml, or
 * undefined when the lockfile does not record it.
 */
export function lockfileCommit(lockfileText, name) {
  if (typeof lockfileText !== 'string') return undefined
  // pnpm v9 records git deps as "<name>@git+<url>#<commit>:" package keys
  // (the name lives in the key, not in a name: field).
  const keyRe = /(?:^|\n)\s*([^\s@]+)@(git\+[^\s]+)#([0-9a-f]{7,40}):/gm
  let match
  while ((match = keyRe.exec(lockfileText)) !== null) {
    if (match[1] === name) return match[3]
  }
  // Legacy form: "git+<url>#<commit>:" with a four-space "name:" field
  // inside the record. The next record is two-space indented; field lines
  // are four-space indented, so require two spaces NOT followed by a space.
  const legacyRe = /(git\+[^\n\s]+)#([0-9a-f]{7,40}):\s*$/gm
  while ((match = legacyRe.exec(lockfileText)) !== null) {
    const key = match[0]
    const start = match.index
    const searchFrom = start + key.length
    const nextMatch = /\n {2}(?! )/.exec(lockfileText.slice(searchFrom))
    const next = nextMatch === null ? -1 : searchFrom + nextMatch.index
    const block = next === -1 ? lockfileText.slice(start) : lockfileText.slice(start, next)
    if (block.includes(`name: ${name}`)) return match[2]
  }
  return undefined
}

function updatesFilePath(profileDirectory) {
  return join(profileDirectory, '.dsh-plugin-manager', UPDATES_FILE)
}

async function readCache(profileDirectory) {
  try {
    const parsed = JSON.parse(await readFile(updatesFilePath(profileDirectory), 'utf8'))
    if (
      typeof parsed.checkedAt === 'number' &&
      typeof parsed.items === 'object' &&
      parsed.items !== null
    ) {
      return parsed
    }
    return undefined
  } catch {
    return undefined
  }
}

async function writeCache(profileDirectory, checkedAt, items) {
  const dir = join(profileDirectory, '.dsh-plugin-manager')
  await mkdir(dir, { recursive: true })
  const file = updatesFilePath(profileDirectory)
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify({ checkedAt, items }, null, 2), 'utf8')
  await rm(file, { force: true }).catch(() => undefined)
  await writeFile(file, JSON.stringify({ checkedAt, items }, null, 2), 'utf8')
  await rm(temporary, { force: true }).catch(() => undefined)
}

/**
 * Check every installed plugin for updates. Returns a summary for the UI.
 * @param options.force - bypass the one-hour cache.
 * @param options.now - injectable clock for tests.
 * @param options.fetchImpl - injectable fetch for tests.
 * @param options.spawnSync - injectable git for tests.
 */
export async function checkUpdates(profileDirectory, options = {}) {
  const now = options.now ?? Date.now()
  const installed = readInstalled(profileDirectory)
  const force = options.force === true

  if (!force) {
    const cached = await readCache(profileDirectory)
    if (cached !== undefined && now - cached.checkedAt < (options.cacheTtlMs ?? CACHE_TTL_MS)) {
      return buildSummary(cached.checkedAt, cached.items, installed)
    }
  }

  let lockfileText
  try {
    lockfileText = await readFile(join(profileDirectory, 'pnpm-lock.yaml'), 'utf8')
  } catch {
    lockfileText = undefined
  }

  const items = {}
  const checks = installed.map(async (plugin) => {
    const kind = classifySpec(plugin.spec)
    const npmName = npmTargetOf(plugin)
    if (npmName !== undefined) {
      const latest = await checkNpmUpdate(npmName, options)
      items[plugin.name] = {
        kind: 'npm',
        latest,
        available: latest !== undefined && plugin.version !== undefined && latest !== plugin.version,
        at: now,
      }
      return
    }
    if (kind === 'local' || kind === 'unknown') {
      items[plugin.name] = { kind, latest: undefined, available: false, at: now }
      return
    }
    // git: compare the lockfile-resolved commit against the remote HEAD.
    const installedCommit = lockfileCommit(lockfileText ?? '', plugin.name)
    if (installedCommit === undefined) {
      items[plugin.name] = { kind: 'git', latest: undefined, available: false, at: now }
      return
    }
    const remoteCommit = gitHeadCommit(plugin.spec, options)
    items[plugin.name] = {
      kind: 'git',
      latest: remoteCommit,
      available: remoteCommit !== undefined && remoteCommit !== installedCommit,
      at: now,
    }
  })
  await Promise.allSettled(checks)

  await writeCache(profileDirectory, now, items)
  return buildSummary(now, items, installed)
}

function buildSummary(checkedAt, items, installed) {
  const updates = []
  const unknown = []
  const checked = []
  for (const plugin of installed) {
    const item = items[plugin.name]
    if (item === undefined) continue
    if (item.available) {
      updates.push({
        name: plugin.name,
        current: plugin.version ?? plugin.spec,
        latest: item.latest,
        spec: plugin.spec,
        kind: item.kind,
      })
    } else if (item.kind === 'git' && item.latest === undefined) {
      unknown.push(plugin.name)
    } else if (item.kind === 'npm' && item.latest === undefined) {
      unknown.push(plugin.name)
    } else {
      checked.push(plugin.name)
    }
  }
  return { checkedAt, updates, unknown, checked }
}
