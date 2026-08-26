/**
 * Process layer for dsh-private-plugins: re-invoking the dsh CLI that
 * launched this host, spawning `dsh plugin --profile <p> <args...>` with a
 * timeout and bounded output. This is the only module that starts child
 * processes — installs run through node:child_process because the agent
 * shell service is sandboxed and denies writes to the profile directory.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { killProcessTree } from './validate.js'

/** 15 minutes: slow networks and git installs both need the room. */
export const OPERATION_TIMEOUT_MS = 15 * 60 * 1000
const MAX_OUTPUT_BYTES = 32 * 1024

/**
 * The real Node executable for spawning children. On desktop hosts the
 * running process is an Electron utility process; process.execPath is the
 * Electron helper, which only behaves as Node when ELECTRON_RUN_AS_NODE is
 * set in the child environment — it is inherited from the harness entry,
 * which declares it for its children.
 */
export function nodeExecutable(execPath = process.execPath) {
  return execPath
}

/**
 * Argv that re-invokes the CLI which launched this host, so installs work
 * whether dsh runs from a global bin, a local install, or repo source
 * (`node --import tsx/esm .../bin.ts`). Falls back to a PATH `dsh`.
 */
export function dshArgv(argv = process.argv, platform = process.platform) {
  const entry = argv[1]
  if (entry !== undefined && /[\\/](?:bin\.(?:js|ts)|dsh)$/.test(entry)) {
    // Absolute paths are required: source launches pass a relative entry,
    // which the child would resolve against its OWN cwd and die with
    // MODULE_NOT_FOUND. cwd near the entry keeps execArgv imports
    // (tsx/esm) resolvable on source launches.
    const abs = resolve(entry)
    return {
      file: nodeExecutable(),
      args: [...process.execArgv, abs],
      cwd: dirname(abs),
      viaShell: false,
    }
  }
  // A bare `dsh` is a .cmd shim on Windows that only a shell can start.
  return { file: 'dsh', args: [], cwd: undefined, viaShell: platform === 'win32' }
}

/** Environment for the spawned CLI: same pnpm discipline as DSH Desktop. */
export function buildPluginEnvironment(environment = process.env) {
  const result = { ...environment }
  result.DSH_HOME = result.DSH_HOME || ''
  result.CI = 'true'
  result.NO_COLOR = '1'
  result.PNPM_MAX_WORKERS = '1'
  result.npm_config_child_concurrency = '1'
  result.npm_config_package_import_method = 'clone-or-copy'
  result.npm_config_side_effects_cache = 'false'
  result.PNPM_CONFIG_CHILD_CONCURRENCY = '1'
  result.PNPM_CONFIG_PACKAGE_IMPORT_METHOD = 'clone-or-copy'
  result.PNPM_CONFIG_SIDE_EFFECTS_CACHE = 'false'
  return result
}

function commandLine(parts) {
  return parts
    .map((part) => `'${String(part).replaceAll("'", `'\\''`)}'`)
    .join(' ')
}

/**
 * Run one `dsh plugin --profile <profile> <args...>` command with a
 * timeout and bounded combined output.
 * @returns the child's exit code and bounded output.
 */
export function runDshPlugin(profile, args, options = {}) {
  const {
    profileDirectory,
    timeoutMs = OPERATION_TIMEOUT_MS,
    environment = process.env,
    argv = process.argv,
    platform = process.platform,
  } = options
  const { file, args: entryArgs, cwd, viaShell } = dshArgv(argv, platform)
  const fullArgs = [...entryArgs, 'plugin', '--profile', profile, ...args]
  const env = buildPluginEnvironment(environment)

  const spawnOptions = {
    cwd: profileDirectory ?? cwd ?? process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: platform !== 'win32',
  }

  const spawnChild = (fileToSpawn, spawnArgs) => {
    if (viaShell && platform === 'win32') {
      // The .cmd shim needs cmd.exe (CVE-2024-27980 hardening refuses it
      // otherwise). The profile name was validated to be shell-safe.
      return spawn(
        process.env.COMSPEC || 'cmd.exe',
        ['/d', '/s', '/c', commandLine([fileToSpawn, ...spawnArgs])],
        { ...spawnOptions, shell: false, windowsVerbatimArguments: true }
      )
    }
    return spawn(fileToSpawn, spawnArgs, { ...spawnOptions, shell: false })
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let child
    try {
      child = spawnChild(file, fullArgs)
    } catch (error) {
      rejectPromise(error)
      return
    }
    let output = ''
    const append = (chunk) => {
      output = `${output}${chunk.toString('utf8')}`.slice(-MAX_OUTPUT_BYTES)
    }
    child.stdout?.on('data', append)
    child.stderr?.on('data', append)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, timeoutMs)

    child.once('error', (error) => {
      clearTimeout(timer)
      rejectPromise(error)
    })
    child.once('close', (code, signal) => {
      clearTimeout(timer)
      resolvePromise({ code, signal, timedOut, output })
    })
  })
}

/** True when the running process looks like it can spawn the dsh CLI. */
export function canReachDsh() {
  const { file } = dshArgv()
  return file !== 'dsh' || existsSync(process.env.COMSPEC || '')
}
