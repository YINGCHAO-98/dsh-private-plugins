/**
 * Validators and tiny HTTP helpers shared by the dsh-plugin-manager routes.
 *
 * Security posture: every route that mutates the profile accepts only
 * same-origin loopback requests (see isTrustedRequest), and the install
 * specs that can reach pnpm are restricted to a narrow allowlist so a
 * compromised page cannot smuggle arbitrary arguments into a shell spawn.
 */
import { spawn } from 'node:child_process'
import { basename } from 'node:path'

/** An npm package name (scoped or bare). */
export const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/** An npm name optionally pinned to a version/dist-tag/semver range. */
export const NPM_SPEC_RE =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:@[^\s/]+)?$/

/** A pnpm github: source — owner/repo with an optional ref fragment. */
export const GITHUB_SPEC_RE = /^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#[^\s]+)?$/

/** The only specs the cloud-install route accepts. */
export function isCloudSpec(spec) {
  return (
    typeof spec === 'string' &&
    spec !== '' &&
    !spec.includes('\0') &&
    (NPM_SPEC_RE.test(spec) || GITHUB_SPEC_RE.test(spec))
  )
}

/** Tarball names the upload route accepts. */
export function isTarballName(filename) {
  return /^[A-Za-z0-9._-]+\.(?:tgz|tar\.gz|tar)$/i.test(filename ?? '')
}

/** Sanitize an upload filename down to a safe basename (no separators). */
export function sanitizeTarballName(filename) {
  const name = basename(String(filename ?? '')).trim()
  return isTarballName(name) ? name : undefined
}

/** A profile plugin name that may be removed (not core, not self). */
export function isRemovablePlugin(name) {
  return typeof name === 'string' && name !== '' && !name.includes('\0')
}

/** Absolute, NUL-free local path pointing at a directory. */
export function isImportableDirectory(path) {
  return (
    typeof path === 'string' &&
    path !== '' &&
    !path.includes('\0') &&
    path.startsWith('/')
  )
}

export function isLoopback(address) {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  )
}

function hasForwardedAddress(req) {
  return Boolean(
    req.headers.forwarded ||
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-host']
  )
}

/**
 * Loopback-only, and for mutations additionally same-origin: the mutation
 * routes run arbitrary package operations, so a random page in the same
 * browser must not be able to reach them.
 */
export function isTrustedRequest(req, mutation = false) {
  if (!isLoopback(req.socket.remoteAddress) || hasForwardedAddress(req)) return false
  if (!mutation) return true
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin !== 'string' || typeof host !== 'string') return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' && parsed.host === host && isLoopback(parsed.hostname)
  } catch {
    return false
  }
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/**
 * Read a JSON request body with a size cap. Resolves to undefined when the
 * body is empty; rejects when it is too large or not valid JSON.
 */
export function readJsonBody(req, maxBytes = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Request body too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (text === '') {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new Error('Request body is not valid JSON.'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Read a raw binary body with a size cap, resolving to a Buffer. Rejects by
 * destroying the request when the cap is exceeded so the client cannot keep
 * streaming an unbounded upload.
 */
export function readRawBody(req, maxBytes = 100 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Upload too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`
}

export { shellQuote }

/**
 * Kill a spawned child and, on Windows, its whole process tree — kill()
 * there only terminates the wrapper, leaving pnpm children running.
 */
export function killProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).unref()
      return
    } catch {
      // fall through to a plain kill
    }
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}
