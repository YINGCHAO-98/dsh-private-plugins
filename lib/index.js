/**
 * dsh-private-plugins host entry: mounts the private-plugin HTTP routes once
 * the profile composes the webServer service.
 *
 * The browser UI (client/client.js) talks to these routes over the same
 * loopback origin: it manages the user's private git repositories (add /
 * list / remove), uploads local tarballs, picks local folders (DSH Desktop
 * native picker), installs and removes plugins. Every install/remove runs
 * `dsh plugin --profile <p> <args...>` in the profile directory, exactly
 * like the community market and DSH Desktop do.
 *
 * Mutations are fire-and-forget: the route responds 202 immediately and the
 * client polls /status while `busy` is true — a pnpm run can take minutes,
 * and an HTTP request must not stay open that long.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runDshPlugin, OPERATION_TIMEOUT_MS } from './dsh.js'
import {
  argvProfile,
  dshHome,
  isDirectory,
  profileDir,
  readInstalled,
  selectManagedInstalled,
  SELF_NAME,
  CORE_BUNDLES,
} from './profile.js'
import { addRepo, isRepoSpec, loadRepos, removeRepo } from './repos.js'
import { checkUpdates } from './updates.js'
import { isPluginDisabled, setPluginEnabled } from './toggle.js'
import {
  isCloudSpec,
  isImportableDirectory,
  isRemovablePlugin,
  isTrustedRequest,
  readJsonBody,
  readRawBody,
  sanitizeTarballName,
  sendJson,
} from './validate.js'

export const name = 'dsh-private-plugins'
export const inject = ['webServer']

const BASE = '/dsh-private-plugins'
const STATUS_PATH = `${BASE}/status`
const REPOS_PATH = `${BASE}/repos`
const REPOS_ADD_PATH = `${BASE}/repos/add`
const REPOS_REMOVE_PATH = `${BASE}/repos/remove`
const INSTALL_PATH = `${BASE}/install`
const IMPORT_UPLOAD_PATH = `${BASE}/import-upload`
const IMPORT_PATH_PATH = `${BASE}/import-path`
const REMOVE_PATH = `${BASE}/remove`
const TOGGLE_PATH = `${BASE}/toggle`
const UPDATES_PATH = `${BASE}/updates`

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

function ownVersion() {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    )
    return typeof manifest.version === 'string' ? manifest.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

const VERSION = ownVersion()

/**
 * The active profile. DSH Desktop owns the profile location through
 * DSH_HOME; the CLI-derived profile name (fallback `web`) covers ordinary
 * web/headless hosts.
 */
function resolveProfile(config) {
  const profile = typeof config.profile === 'string' && config.profile !== ''
    ? config.profile
    : (argvProfile() ?? 'web')
  const home = dshHome()
  const directory = profileDir(profile, home)
  return { profile, home, directory }
}

/** Last line worth showing from a failed run's output. */
function diagnosticLine(output) {
  const lines = output
    .trim()
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const named = lines.filter((line) =>
    /EPERM|EBUSY|EACCES|EEXIST|ENOTEMPTY|ENOENT|ERR_PNPM|error:/u.test(line)
  )
  return (named.at(-1) ?? lines.at(-1))?.slice(0, 800)
}

export function apply(ctx, config = {}) {
  ctx.inject(['webServer'], (hostCtx) =>
    hostCtx.effect(
      () => {
        const { profile, directory } = resolveProfile(config)
        const logger = hostCtx.logger
        let activeOperation = null
        let lastOperation = null
        let restartRequired = false

        const log = (level, message) => {
          try {
            logger?.[level]?.(message)
          } catch {
            // logging must never take the routes down
          }
        }

        const snapshotInstalled = () => readInstalled(directory)
        const snapshotManagedInstalled = async () => {
          const installed = selectManagedInstalled(
            snapshotInstalled(),
            await loadRepos(directory)
          )
          // Market-style enabled state: a plugin is disabled when the
          // profile's user patch layer disables any row it owns.
          return installed.map((plugin) => ({
            ...plugin,
            disabled: isPluginDisabled(directory, plugin.name),
          }))
        }

        /**
         * Start one dsh plugin command in the background. Responding routes
         * must NOT await this — the client polls /status instead.
         * @param onSettled - optional cleanup callback, runs when done.
         * @param meta - extra fields recorded on lastOperation (e.g.
         *   `{ updated: ['dsh-x'] }` for update runs, so the UI can badge
         *   the plugin as 已更新/updated until the host restarts).
         * @returns the settling promise (for cleanup chaining only).
         */
        const startOperation = (kind, label, args, onSettled, meta = {}) => {
          if (activeOperation) {
            throw new Error('Another plugin operation is already running.')
          }
          const before = new Set(snapshotInstalled().map((entry) => entry.name))
          const handle = { kind, label, startedAt: Date.now() }
          activeOperation = handle
          const promise = (async () => {
            try {
              const result = await runDshPlugin(profile, args, {
                profileDirectory: directory,
              })
              if (result.timedOut) {
                throw new Error(
                  `${label} timed out after ${Math.round(OPERATION_TIMEOUT_MS / 60_000)} minutes.`
                )
              }
              if (result.code !== 0) {
                throw new Error(
                  diagnosticLine(result.output) ??
                    `${label} exited with ${result.signal ? `signal ${result.signal}` : `code ${result.code}`}.`
                )
              }
              const after = snapshotInstalled()
              const added = after
                .map((entry) => entry.name)
                .filter((entryName) => !before.has(entryName))
              restartRequired = true
              lastOperation = {
                kind,
                ok: true,
                label,
                added,
                ...meta,
                detail: result.output
                  .trim()
                  .split(/\r?\n/u)
                  .filter(Boolean)
                  .at(-1)
                  ?.slice(0, 400),
                at: Date.now(),
                restartRequired: true,
              }
              log('info', `${label} succeeded${added.length > 0 ? `: ${added.join(', ')}` : ''}`)
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error)
              lastOperation = {
                kind,
                ok: false,
                label,
                added: [],
                ...meta,
                detail,
                at: Date.now(),
                restartRequired: false,
              }
              log('warn', `${label} failed: ${detail}`)
            } finally {
              activeOperation = null
              onSettled?.()
            }
          })()
          return promise
        }

        const status = async () => ({
          ok: true,
          version: VERSION,
          profile,
          profileDirectory: directory,
          busy: activeOperation !== null,
          lastOperation,
          restartRequired,
          installed: await snapshotManagedInstalled(),
        })

        /** Register one exact route; returns its disposer. */
        const route = (path, handler) =>
          hostCtx.webServer.register({ kind: 'exact', path, handler })

        /**
         * Shared guard for mutating routes: POST + same-origin + single
         * flight, then start the operation and reply 202 immediately.
         */
        const beginMutation = async (req, res, action) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' })
            return
          }
          if (!isTrustedRequest(req, true)) {
            sendJson(res, 403, { error: 'Request rejected.' })
            return
          }
          if (activeOperation) {
            sendJson(res, 409, await status())
            return
          }
          try {
            action()
            sendJson(res, 202, { ok: true, busy: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        }

        const disposeStatus = route(STATUS_PATH, async (req, res) => {
          if (req.method !== 'GET' || !isTrustedRequest(req)) {
            sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          sendJson(res, 200, await status())
        })

        const disposeUpdates = route(UPDATES_PATH, async (req, res) => {
          if (req.method !== 'GET' || !isTrustedRequest(req)) {
            sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          try {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1')
            const summary = await checkUpdates(directory, {
              force: url.searchParams.get('force') === '1',
              installed: await snapshotManagedInstalled(),
            })
            sendJson(res, 200, { ok: true, ...summary })
          } catch (error) {
            sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        })

        const disposeReposList = route(REPOS_PATH, async (req, res) => {
          if (req.method !== 'GET' || !isTrustedRequest(req)) {
            sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          sendJson(res, 200, { ok: true, repos: await loadRepos(directory) })
        })

        const disposeReposAdd = route(REPOS_ADD_PATH, async (req, res) => {
          if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
            sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          try {
            const body = await readJsonBody(req)
            const repo = await addRepo(directory, body?.url, {
              label: body?.label,
            })
            sendJson(res, 200, { ok: true, repo })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        })

        const disposeReposRemove = route(REPOS_REMOVE_PATH, async (req, res) => {
          if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
            sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          try {
            const body = await readJsonBody(req)
            const repos = await removeRepo(directory, body?.id ?? body?.url)
            sendJson(res, 200, { ok: true, repos })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        })

        const disposeInstall = route(INSTALL_PATH, async (req, res) => {
          const body = await readJsonBody(req)
          await beginMutation(req, res, () => {
            const spec = body?.spec
            if (!isCloudSpec(spec) && !isRepoSpec(spec)) {
              throw new Error(
                'Invalid plugin spec — expected an npm name/version, a github: source, or a git repository URL.'
              )
            }
            if (body?.update === true) {
              // Reinstall the named plugin at its latest remote revision.
              // The updated name rides lastOperation so the UI can badge it
              // as 已更新/updated until the host restarts.
              const name = typeof body?.name === 'string' && body.name !== '' ? body.name : spec
              startOperation('update', `Update ${name}`, ['add', spec], undefined, {
                updated: [name],
              })
              return
            }
            startOperation('install', `Install ${spec}`, ['add', spec])
          })
        })

        const disposeImportUpload = route(IMPORT_UPLOAD_PATH, async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' })
            return
          }
          if (!isTrustedRequest(req, true)) {
            sendJson(res, 403, { error: 'Request rejected.' })
            return
          }
          if (activeOperation) {
            sendJson(res, 409, await status())
            return
          }
          const filename = sanitizeTarballName(req.headers['x-plugin-filename'])
          if (filename === undefined) {
            sendJson(res, 400, {
              error:
                'Missing or invalid plugin filename — expected a .tgz, .tar.gz or .tar archive.',
            })
            return
          }
          let staged
          try {
            const body = await readRawBody(req, MAX_UPLOAD_BYTES)
            if (body.length === 0) {
              sendJson(res, 400, { error: 'Empty upload.' })
              return
            }
            const inbox = join(directory, '.dsh-private-plugins', 'inbox')
            await mkdir(inbox, { recursive: true })
            staged = join(inbox, filename)
            await writeFile(staged, body)
            // The tarball stays in the profile's inbox on purpose: the
            // manifest records the dependency as `file:<inbox>/x.tgz`, and
            // every later pnpm run re-resolves that path. Deleting it here
            // would break subsequent installs and removals with ENOENT.
            startOperation('import-upload', `Import ${filename}`, [
              'add',
              `file:${staged}`,
            ])
            sendJson(res, 202, { ok: true, busy: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        })

        const disposeImportPath = route(IMPORT_PATH_PATH, async (req, res) => {
          const body = await readJsonBody(req)
          await beginMutation(req, res, () => {
            const path = body?.path
            if (!isImportableDirectory(path)) {
              throw new Error('Invalid path — expected an absolute local directory path.')
            }
            if (!isDirectory(path)) {
              throw new Error(`Not a directory: ${path}`)
            }
            const nodeModules = join(directory, 'node_modules')
            if (
              path === directory ||
              path === nodeModules ||
              path.startsWith(nodeModules + '/') ||
              path.startsWith(nodeModules + '\\')
            ) {
              throw new Error('Refusing to import the profile directory itself.')
            }
            startOperation('import-path', `Import ${path}`, ['add', path])
          })
        })

        const disposeRemove = route(REMOVE_PATH, async (req, res) => {
          const body = await readJsonBody(req)
          await beginMutation(req, res, () => {
            const pluginName = body?.name
            if (!isRemovablePlugin(pluginName)) {
              throw new Error('Invalid plugin name.')
            }
            if (pluginName === SELF_NAME || CORE_BUNDLES.has(pluginName)) {
              throw new Error(`${pluginName} is protected and cannot be removed here.`)
            }
            if (!snapshotInstalled().some((entry) => entry.name === pluginName)) {
              throw new Error(`${pluginName} is not installed.`)
            }
            startOperation('remove', `Remove ${pluginName}`, ['remove', pluginName])
          })
        })

        const disposeToggle = route(TOGGLE_PATH, async (req, res) => {
          if (req.method !== 'POST' || !isTrustedRequest(req, true)) {
            sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' })
            return
          }
          if (activeOperation) {
            sendJson(res, 409, await status())
            return
          }
          try {
            const body = await readJsonBody(req)
            const pluginName = body?.name
            if (!isRemovablePlugin(pluginName)) {
              throw new Error('Invalid plugin name.')
            }
            if (pluginName === SELF_NAME || CORE_BUNDLES.has(pluginName)) {
              throw new Error(`${pluginName} is protected and cannot be toggled here.`)
            }
            if (!snapshotInstalled().some((entry) => entry.name === pluginName)) {
              throw new Error(`${pluginName} is not installed.`)
            }
            const enabled = body?.enabled !== false
            const result = await setPluginEnabled(directory, pluginName, enabled)
            if (!result.ok) {
              throw new Error(result.reason ?? 'The patch layer refused the change.')
            }
            restartRequired = true
            lastOperation = {
              kind: 'toggle',
              ok: true,
              label: `${enabled ? 'Enable' : 'Disable'} ${pluginName}`,
              added: [],
              updated: [],
              detail: enabled
                ? 'Enabled in the profile patch layer — restart to activate.'
                : 'Disabled in the profile patch layer — restart to apply.',
              at: Date.now(),
              restartRequired: true,
            }
            log('info', `${enabled ? 'Enabled' : 'Disabled'} ${pluginName} in the patch layer`)
            sendJson(res, 200, { ok: true, disabled: !enabled })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        })

        log('info', `dsh-private-plugins ${VERSION} mounted for profile ${profile} (${directory})`)

        return async () => {
          disposeToggle()
          disposeRemove()
          disposeImportPath()
          disposeImportUpload()
          disposeInstall()
          disposeReposRemove()
          disposeReposAdd()
          disposeReposList()
          disposeUpdates()
          disposeStatus()
        }
      },
      'dsh-private-plugins: http routes'
    )
  )
}
