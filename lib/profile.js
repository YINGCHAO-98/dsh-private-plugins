/**
 * Profile resolution and manifest reads for dsh-plugin-manager.
 *
 * The plugin always runs inside an already-booted profile, so the active
 * profile is discovered from the CLI invocation that launched this host
 * (--profile <name>), with `web` as the fallback — the same rule the
 * community market uses. DSH Desktop owns the active profile location and
 * passes it through DSH_HOME, which this module honours.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** The in-box bundles every profile template ships — never removable. */
export const CORE_BUNDLES = new Set([
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
  '@deepseek-ai/dsh-headless',
])

/** This plugin's own package name, protected from self-removal. */
export const SELF_NAME = 'dsh-plugin-manager'

/** A profile name must match DSH's own directory-name contract. */
export function isDshProfileName(profile) {
  return (
    profile !== '' &&
    profile !== '.' &&
    profile !== '..' &&
    profile !== 'node_modules' &&
    !profile.includes('/') &&
    !profile.includes('\\') &&
    !profile.includes('\0')
  )
}

/** The profile name this host process was booted with, if any. */
export function argvProfile(argv = process.argv) {
  const flag = argv.indexOf('--profile')
  if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-')) {
    return argv[flag + 1]
  }
  return undefined
}

export function dshHome(env = process.env) {
  return env.DSH_HOME || join(homedir(), '.dsh')
}

/** Resolve a profile name to its directory under DSH_HOME (default ~/.dsh). */
export function profileDir(profile, home = dshHome()) {
  if (!isDshProfileName(profile)) {
    throw new Error(`dsh-plugin-manager: invalid profile name ${JSON.stringify(profile)}`)
  }
  return join(home, 'profiles', profile)
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

/** The profile manifest (package.json), or undefined when absent. */
export function readProfileManifest(directory) {
  return readJson(join(directory, 'package.json'))
}

/**
 * Community-installed plugins: every dependency of the profile manifest
 * except the in-box core bundles, annotated with what the client needs to
 * render the installed list.
 */
export function readInstalled(directory) {
  const manifest = readProfileManifest(directory)
  if (manifest === undefined) return []
  const dependencies = manifest.dependencies ?? {}
  const bundles = manifest.dsh?.profile?.bundles ?? []
  const installed = []
  for (const [name, spec] of Object.entries(dependencies)) {
    if (CORE_BUNDLES.has(name)) continue
    const installedManifest = readJson(join(directory, 'node_modules', name, 'package.json'))
    installed.push({
      name,
      spec: typeof spec === 'string' ? spec : String(spec),
      version: typeof installedManifest?.version === 'string' ? installedManifest.version : undefined,
      description:
        typeof installedManifest?.description === 'string'
          ? installedManifest.description
          : undefined,
      bundle: bundles.includes(name),
      core: false,
      self: name === SELF_NAME,
    })
  }
  installed.sort((a, b) => a.name.localeCompare(b.name))
  return installed
}

/**
 * Plugins owned by this surface: local imports and repositories explicitly
 * saved here. The broader profile inventory also includes community-market
 * installs, which belong to dsh-market and must not be duplicated here.
 */
export function selectManagedInstalled(installed, repos = []) {
  const savedSpecs = new Set(
    repos
      .map((repo) => repo?.spec)
      .filter((spec) => typeof spec === 'string')
  )
  return installed.filter((plugin) => {
    if (plugin.name === SELF_NAME) return false
    const spec = plugin.spec
    const local = spec.startsWith('file:') || spec.startsWith('link:') || spec.startsWith('/')
    return local || savedSpecs.has(spec)
  })
}

/** True when a path is a directory on disk. */
export function isDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}
