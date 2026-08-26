/**
 * Unit tests for the pure logic of dsh-plugin-manager: validators, profile
 * resolution, manifest reads and private-repository handling. No child
 * processes, no network — the install path itself is exercised end-to-end
 * by the live profile install (see README).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  isCloudSpec,
  isTarballName,
  sanitizeTarballName,
  isImportableDirectory,
  isTrustedRequest,
  shellQuote,
} from '../lib/validate.js'
import {
  argvProfile,
  isDshProfileName,
  profileDir,
  readInstalled,
  selectManagedInstalled,
  CORE_BUNDLES,
  SELF_NAME,
  isDirectory,
} from '../lib/profile.js'
import {
  addRepo,
  createRepo,
  isRepoSpec,
  loadRepos,
  normalizeRepoInput,
  removeRepo,
} from '../lib/repos.js'
import { dshArgv, buildPluginEnvironment } from '../lib/dsh.js'
import {
  checkNpmUpdate,
  checkUpdates,
  configuredRegistry,
  classifySpec,
  gitCloneUrl,
  gitHeadCommit,
  gitRefOf,
  gitUrlOf,
  lockfileCommit,
  npmNameOf,
  registryPath,
} from '../lib/updates.js'

test('isCloudSpec accepts npm names, pinned ranges and github sources', () => {
  for (const spec of [
    'dsh-dream-skin',
    'dsh-dream-skin@latest',
    'dsh-dream-skin@^0.4.11',
    'dsh-dream-skin@1.2.3',
    '@scope/plugin',
    '@scope/plugin@^2.0.0',
    'github:owner/repo',
    'github:owner/repo#main',
  ]) {
    assert.equal(isCloudSpec(spec), true, spec)
  }
})

test('isCloudSpec rejects shell-hostile input', () => {
  for (const spec of [
    '',
    'dsh x; rm -rf /',
    'dsh-x\u0000',
    '$(whoami)',
    'a b',
    '../escape',
    'https://evil.example/x.tgz',
    'file:./x',
  ]) {
    assert.equal(isCloudSpec(spec), false, JSON.stringify(spec))
  }
})

test('tarball names are validated and sanitized', () => {
  assert.equal(isTarballName('my-plugin-1.0.0.tgz'), true)
  assert.equal(isTarballName('my-plugin.tar.gz'), true)
  assert.equal(isTarballName('my-plugin.tar'), true)
  assert.equal(isTarballName('my-plugin.zip'), false)
  assert.equal(isTarballName('../../evil.tgz'), false)
  assert.equal(sanitizeTarballName('a/b/evil.tgz'), 'evil.tgz')
  assert.equal(sanitizeTarballName('evil.tgz'), 'evil.tgz')
  assert.equal(sanitizeTarballName('my plugin.tgz'), undefined)
})

test('importable directories require absolute NUL-free paths', () => {
  assert.equal(isImportableDirectory('/Users/x/plugin'), true)
  assert.equal(isImportableDirectory('relative/plugin'), false)
  assert.equal(isImportableDirectory('/bad\u0000path'), false)
  assert.equal(isImportableDirectory(''), false)
})

test('profile name contract', () => {
  assert.equal(isDshProfileName('web'), true)
  assert.equal(isDshProfileName('my profile'), true)
  assert.equal(isDshProfileName(''), false)
  assert.equal(isDshProfileName('..'), false)
  assert.equal(isDshProfileName('a/b'), false)
  assert.equal(isDshProfileName('node_modules'), false)
})

test('argvProfile reads --profile from process arguments', () => {
  assert.equal(argvProfile(['node', 'bin.js', '--profile', 'web', '--port', '1']), 'web')
  assert.equal(argvProfile(['node', 'bin.js', '--port', '1']), undefined)
  assert.equal(argvProfile(['node', 'bin.js', '--profile']), undefined)
  assert.equal(argvProfile(['node', 'bin.js', '--profile', '--port']), undefined)
})

test('profileDir resolves under DSH_HOME', () => {
  assert.equal(profileDir('web', '/tmp/dsh'), join('/tmp/dsh', 'profiles', 'web'))
  assert.throws(() => profileDir('a/b', '/tmp/dsh'))
})

test('readInstalled lists community deps with annotations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pm-'))
  try {
    mkdirSync(join(dir, 'node_modules', 'dsh-dream-skin'), { recursive: true })
    writeFileSync(
      join(dir, 'node_modules', 'dsh-dream-skin', 'package.json'),
      JSON.stringify({ name: 'dsh-dream-skin', version: '0.4.11', description: 'Dream skin' })
    )
    mkdirSync(join(dir, 'node_modules', SELF_NAME), { recursive: true })
    writeFileSync(
      join(dir, 'node_modules', SELF_NAME, 'package.json'),
      JSON.stringify({ name: SELF_NAME, version: '0.1.0' })
    )
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        dependencies: {
          [CORE_BUNDLES.values().next().value]: '^0.1.1',
          'dsh-dream-skin': '^0.4.11',
          [SELF_NAME]: 'file:../dsh-plugin-manager',
        },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', SELF_NAME] } },
      })
    )
    const installed = readInstalled(dir)
    assert.equal(installed.length, 2)
    const skin = installed.find((entry) => entry.name === 'dsh-dream-skin')
    assert.equal(skin.version, '0.4.11')
    assert.equal(skin.bundle, false)
    assert.equal(skin.core, false)
    const self = installed.find((entry) => entry.name === SELF_NAME)
    assert.equal(self.self, true)
    assert.equal(self.bundle, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('selectManagedInstalled excludes market plugins and the manager itself', () => {
  const installed = [
    { name: SELF_NAME, spec: 'file:../dsh-plugin-manager' },
    { name: 'market-plugin', spec: '^1.2.3' },
    { name: 'private-plugin', spec: 'git+ssh://git@example.com/me/private-plugin.git' },
    { name: 'folder-plugin', spec: 'link:/Users/me/plugins/folder-plugin' },
  ]
  const repos = [{ spec: 'git+ssh://git@example.com/me/private-plugin.git' }]
  assert.deepEqual(
    selectManagedInstalled(installed, repos).map((plugin) => plugin.name),
    ['private-plugin', 'folder-plugin']
  )
})

test('normalizeRepoInput converts common forms to pnpm git specs', () => {
  assert.deepEqual(
    normalizeRepoInput('https://github.com/me/my-plugin'),
    {
      spec: 'git+https://github.com/me/my-plugin.git',
      label: 'github.com/me/my-plugin',
    }
  )
  assert.deepEqual(
    normalizeRepoInput('https://github.com/me/my-plugin.git#main'),
    {
      spec: 'git+https://github.com/me/my-plugin.git#main',
      label: 'github.com/me/my-plugin',
    }
  )
  assert.equal(
    normalizeRepoInput('git@github.com:me/my-plugin.git').spec,
    'git+ssh://git@github.com/me/my-plugin.git'
  )
  assert.equal(normalizeRepoInput('github:me/my-plugin').spec, 'github:me/my-plugin')
  assert.equal(
    normalizeRepoInput('git+ssh://git@gitlab.example/me/repo.git#v1').spec,
    'git+ssh://git@gitlab.example/me/repo.git#v1'
  )
  assert.equal(normalizeRepoInput('git+file:///tmp/repo').spec, 'git+file:///tmp/repo')
})

test('normalizeRepoInput rejects hostile input', () => {
  for (const input of [
    '',
    'rm -rf /',
    'https://evil.example/x;id',
    'git@github.com:a/b | cat',
    'git+https://x/y`touch /tmp/x`',
    'github:a/b\u0000c',
  ]) {
    assert.throws(() => normalizeRepoInput(input), undefined, JSON.stringify(input))
  }
})

test('isRepoSpec accepts git specs and rejects npm names', () => {
  for (const spec of [
    'git+https://github.com/me/my-plugin.git',
    'git+https://github.com/me/my-plugin.git#main',
    'git+ssh://git@github.com/me/my-plugin.git',
    'github:me/my-plugin',
    'gitlab:me/my-plugin#v1',
    'git@github.com:me/my-plugin.git',
    'git+file:///tmp/repo',
  ]) {
    assert.equal(isRepoSpec(spec), true, spec)
  }
  for (const spec of ['dsh-dream-skin', 'dsh-dream-skin@^1.0.0', 'rm -rf /', 'a b', '']) {
    assert.equal(isRepoSpec(spec), false, JSON.stringify(spec))
  }
})

test('repo list persists through add/remove round trips', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pm-repos-'))
  try {
    const added = await addRepo(dir, 'https://github.com/me/my-plugin', { label: 'my plugin' })
    assert.equal(added.spec, 'git+https://github.com/me/my-plugin.git')
    assert.equal(added.label, 'my plugin')
    const second = await addRepo(dir, 'git@github.com:me/other.git')
    assert.equal(second.spec, 'git+ssh://git@github.com/me/other.git')
    const all = await loadRepos(dir)
    assert.equal(all.length, 2)

    await assert.rejects(
      () => addRepo(dir, 'https://github.com/me/my-plugin'),
      /already saved/
    )

    const afterRemove = await removeRepo(dir, added.id)
    assert.equal(afterRemove.length, 1)
    assert.equal(afterRemove[0].spec, 'git+ssh://git@github.com/me/other.git')
    await assert.rejects(() => removeRepo(dir, 'nope'), /not found/)

    // A fresh load reads the same file (persistence, not just memory).
    const reloaded = await loadRepos(dir)
    assert.equal(reloaded.length, 1)
    assert.equal(reloaded[0].label, 'github.com:me/other')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('createRepo derives a label from the address when none given', () => {
  const repo = createRepo('https://github.com/me/my-plugin')
  assert.equal(repo.label, 'github.com/me/my-plugin')
  assert.ok(repo.id.length > 0)
  const labelled = createRepo('https://github.com/me/my-plugin', { label: '我的插件' })
  assert.equal(labelled.label, '我的插件')
})

test('classifySpec sorts sources by where updates come from', () => {
  assert.equal(classifySpec('dsh-dream-skin'), 'npm')
  assert.equal(classifySpec('dsh-dream-skin@^0.4.11'), 'npm')
  assert.equal(classifySpec('@scope/x@1.2.3'), 'npm')
  assert.equal(classifySpec('git+https://github.com/me/repo.git#main'), 'git')
  assert.equal(classifySpec('github:me/repo'), 'git')
  assert.equal(classifySpec('git@github.com:me/repo.git'), 'git')
  assert.equal(classifySpec('git+file:///tmp/repo'), 'git')
  assert.equal(classifySpec('file:./x'), 'local')
  assert.equal(classifySpec('link:../x'), 'local')
  assert.equal(classifySpec('/abs/path'), 'local')
  assert.equal(classifySpec(''), 'unknown')
  assert.equal(classifySpec('weird stuff'), 'unknown')
})

test('npmNameOf and registryPath handle scoped names', () => {
  assert.equal(npmNameOf('dsh-dream-skin@^0.4.11'), 'dsh-dream-skin')
  assert.equal(npmNameOf('@scope/x@1.2.3'), '@scope/x')
  assert.equal(npmNameOf('dsh-x'), 'dsh-x')
  assert.equal(registryPath('@scope/x'), '@scope%2fx')
  assert.equal(registryPath('dsh-x'), 'dsh-x')
})

test('checkNpmUpdate reads dist-tags.latest and tolerates failures', async () => {
  const ok = await checkNpmUpdate('dsh-a', {
    fetchImpl: async () => ({ ok: true, json: async () => ({ 'dist-tags': { latest: '1.2.0' } }) }),
  })
  assert.equal(ok, '1.2.0')
  const notFound = await checkNpmUpdate('dsh-b', {
    fetchImpl: async () => ({ ok: false }),
  })
  assert.equal(notFound, undefined)
  const thrown = await checkNpmUpdate('dsh-c', {
    fetchImpl: async () => { throw new Error('offline') },
  })
  assert.equal(thrown, undefined)
})

test('configuredRegistry honours npm_config_registry', () => {
  assert.equal(
    configuredRegistry({ npm_config_registry: 'https://registry.npmmirror.com/' }),
    'https://registry.npmmirror.com'
  )
  assert.equal(configuredRegistry({}), 'https://registry.npmjs.org')
})

test('git spec ref/url splitting', () => {
  assert.equal(gitUrlOf('git+https://github.com/me/repo.git#main'), 'git+https://github.com/me/repo.git')
  assert.equal(gitRefOf('git+https://github.com/me/repo.git#main'), 'main')
  assert.equal(gitRefOf('git+https://github.com/me/repo.git'), 'HEAD')
  assert.equal(gitRefOf('git+https://github.com/me/repo.git#semver:^1.0.0'), 'HEAD')
})

test('gitHeadCommit reads ls-remote output or fails to undefined', () => {
  const commit = gitHeadCommit('git+https://github.com/me/repo.git#main', {
    spawnSync: () => ({ status: 0, stdout: 'abc1234	refs/heads/main\n' }),
  })
  assert.equal(commit, 'abc1234')
  const failing = gitHeadCommit('git+https://github.com/me/repo.git', {
    spawnSync: () => ({ status: 128, stdout: 'fatal: could not read Username' }),
  })
  assert.equal(failing, undefined)
})

test('lockfileCommit handles pnpm v9 name@git+url#commit keys', () => {
  const lockfile = [
    "lockfileVersion: '9.0'",
    'packages:',
    '  dsh-skin-molly@git+file:///tmp/repo#abc1234:',
    '    resolution: {commit: abc1234, repo: file:///tmp/repo, type: git}',
    '    version: 0.1.0',
    '  dsh-other@git+https://github.com/me/other.git#deadbeef:',
    '    resolution: {commit: deadbeef, repo: https://github.com/me/other.git, type: git}',
    '    version: 0.2.0',
    '',
  ].join('\n')
  assert.equal(lockfileCommit(lockfile, 'dsh-skin-molly'), 'abc1234')
  assert.equal(lockfileCommit(lockfile, 'dsh-other'), 'deadbeef')
  assert.equal(lockfileCommit(lockfile, 'missing'), undefined)
})

test('lockfileCommit falls back to the legacy git+url#commit key form', () => {
  const lockfile = [
    "lockfileVersion: '9.0'",
    'packages:',
    '  git+https://github.com/me/repo.git#abc1234:',
    '    name: dsh-skin-molly',
    '    version: 0.1.0',
    '',
  ].join('\n')
  assert.equal(lockfileCommit(lockfile, 'dsh-skin-molly'), 'abc1234')
})

test('gitCloneUrl strips the pnpm git+ protocol prefix', () => {
  assert.equal(gitCloneUrl('git+file:///tmp/repo#main'), 'file:///tmp/repo')
  assert.equal(gitCloneUrl('git+https://github.com/me/repo.git#main'), 'https://github.com/me/repo.git')
  assert.equal(gitCloneUrl('github:me/repo'), 'github:me/repo')
})

test('checkUpdates reports available/unknown/local and honours the cache', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pm-updates-'))
  try {
    const deps = {
      'dsh-a': '^1.0.0',
      'dsh-b': 'file:../b',
      'dsh-c': '^0.5.0',
      'dsh-git': 'git+https://github.com/me/repo.git#main',
    }
    mkdirSync(join(dir, 'node_modules', 'dsh-a'), { recursive: true })
    mkdirSync(join(dir, 'node_modules', 'dsh-b'), { recursive: true })
    mkdirSync(join(dir, 'node_modules', 'dsh-c'), { recursive: true })
    mkdirSync(join(dir, 'node_modules', 'dsh-git'), { recursive: true })
    for (const [name, version] of [['dsh-a', '1.0.0'], ['dsh-b', '0.1.0'], ['dsh-c', '0.5.0'], ['dsh-git', '0.1.0']]) {
      writeFileSync(
        join(dir, 'node_modules', name, 'package.json'),
        JSON.stringify({ name, version })
      )
    }
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'p', dependencies: deps, dsh: { profile: { bundles: [] } } })
    )
    writeFileSync(
      join(dir, 'pnpm-lock.yaml'),
      'packages:\n  git+https://github.com/me/repo.git#abc1234:\n    name: dsh-git\n    version: 0.1.0\n'
    )

    let fetchCalls = 0
    const fetchImpl = async (url) => {
      fetchCalls += 1
      if (url.includes('/dsh-a')) return { ok: true, json: async () => ({ 'dist-tags': { latest: '1.2.0' } }) }
      if (url.includes('/dsh-c')) throw new Error('offline')
      return { ok: false }
    }
    const spawnSync = () => ({ status: 128, stdout: '' })

    const first = await checkUpdates(dir, { fetchImpl, spawnSync, now: 1000 })
    assert.deepEqual(
      first.updates.map((item) => item.name),
      ['dsh-a']
    )
    assert.equal(first.updates[0].current, '1.0.0')
    assert.equal(first.updates[0].latest, '1.2.0')
    assert.deepEqual(first.unknown.sort(), ['dsh-c', 'dsh-git'])
    assert.deepEqual(first.checked, ['dsh-b'])

    // Cached: no extra fetches.
    const second = await checkUpdates(dir, { fetchImpl, spawnSync, now: 1000 + 60_000 })
    assert.equal(fetchCalls, 2)
    assert.equal(second.updates.length, 1)

    // Force bypasses the cache.
    const third = await checkUpdates(dir, { fetchImpl, spawnSync, now: 2000, force: true })
    assert.equal(fetchCalls, 4)
    assert.equal(third.updates.length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('dshArgv re-invokes the CLI that launched the host', () => {
  const argv = ['node', '/app/node_modules/@deepseek-ai/dsh/lib/bin.js', 'web']
  const resolved = dshArgv(argv, 'darwin')
  assert.equal(resolved.viaShell, false)
  assert.ok(resolved.args[resolved.args.length - 1].endsWith('bin.js'))
  assert.equal(resolved.cwd, '/app/node_modules/@deepseek-ai/dsh/lib')
})

test('dshArgv falls back to a PATH dsh on Windows', () => {
  const resolved = dshArgv(['node', '--eval', 'x'], 'win32')
  assert.equal(resolved.file, 'dsh')
  assert.equal(resolved.viaShell, true)
})

test('plugin environment pins pnpm discipline', () => {
  const env = buildPluginEnvironment({ PATH: '/usr/bin' })
  assert.equal(env.CI, 'true')
  assert.equal(env.PNPM_MAX_WORKERS, '1')
  assert.equal(env.npm_config_package_import_method, 'clone-or-copy')
  assert.equal(env.DSH_HOME, '')
})

test('isTrustedRequest allows loopback and rejects forwarded/origin mismatches', () => {
  const req = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { origin: 'http://127.0.0.1:3080', host: '127.0.0.1:3080' },
  }
  assert.equal(isTrustedRequest(req, false), true)
  assert.equal(isTrustedRequest(req, true), true)
  const forwarded = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': '8.8.8.8' },
  }
  assert.equal(isTrustedRequest(forwarded, false), false)
  const wrongOrigin = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { origin: 'https://evil.example', host: '127.0.0.1:3080' },
  }
  assert.equal(isTrustedRequest(wrongOrigin, true), false)
  const remote = { socket: { remoteAddress: '192.168.1.5' }, headers: {} }
  assert.equal(isTrustedRequest(remote, false), false)
})

test('shellQuote wraps and escapes single quotes', () => {
  assert.equal(shellQuote("it's"), "'it'\\''s'")
  assert.equal(shellQuote('plain'), "'plain'")
})

test('isDirectory checks the filesystem', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pm-dir-'))
  try {
    assert.equal(isDirectory(dir), true)
    assert.equal(isDirectory(join(dir, 'missing')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
