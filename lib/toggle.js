/**
 * Enable/disable for installed plugins, market-style: the switch is a row
 * in the profile's user patch layer (`cordis.patch.yml`), the same
 * mechanism dsh-market writes and the same file a user would hand-edit.
 *
 * The profile is composed as patches: every bundle's cordis.patch.yml, then
 * the profile's own cordis.patch.yml, then launcher overlays. A top-level
 * `- id: <rowId>` + `disabled: true` row in the user layer disables that
 * plugin's loader row; removing the block (or writing `disabled: false`)
 * re-enables it. The patch layer is read at boot, so toggles apply after a
 * Harness restart — matching install/update/remove, which also require one.
 *
 * The row id of a plugin is its bundle patch's inserted ids (the rows it
 * actually owns), falling back to the package name. This deliberately
 * mirrors dsh-market's rule: only the rows a package itself inserts are
 * ever toggled, never rows it merely reconfigures.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJson } from './profile.js'

/** Row ids we are allowed to write: plain unquoted YAML scalars. */
export const ROW_ID_RE = /^[A-Za-z0-9_.-]+$/u

/** The profile's user patch layer filename (the dsh boot contract). */
export const PROFILE_PATCH_FILENAME = 'cordis.patch.yml'

export function patchFilePath(profileDirectory) {
  return join(profileDirectory, PROFILE_PATCH_FILENAME)
}

/**
 * Line-wise scan of the patch layer — what the user layer says about each
 * row id. Deliberately not a full YAML parse: a plain `- id: X` +
 * `disabled: true|false` pair is all that matters here, and the file may
 * hold structures our dialect rejects.
 */
export function readPatchState(patchPath) {
  const disables = []
  const forced = []
  const inserts = []
  let text = ''
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch {
    // no patch file yet — empty state
  }
  const lines = text.split(/\r?\n/u)
  let inInsert = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (/^- insert:\s*$/u.test(line)) {
      inInsert = true
      continue
    }
    if (/^- /u.test(line)) inInsert = false
    if (inInsert) {
      const insertRow = /^ {4}- id: ([A-Za-z0-9_.-]+)/u.exec(line)
      if (insertRow !== null) inserts.push(insertRow[1])
      continue
    }
    const disableRow = /^- id: ([A-Za-z0-9_.-]+)\s*$/u.exec(line)
    if (disableRow === null) continue
    const next = lines[index + 1] ?? ''
    if (/^ {2}disabled: true\s*$/u.test(next)) disables.push(disableRow[1])
    else if (/^ {2}disabled: false\s*$/u.test(next)) forced.push(disableRow[1])
  }
  return { disables, forced, inserts }
}

/** The ids a plugin's own bundle patch inserts (the rows it owns). */
function bundlePatchInsertedIds(packageDirectory) {
  const ids = []
  const collect = (file) => {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return
    }
    const lines = text.split(/\r?\n/u)
    let inInsert = false
    for (const line of lines) {
      if (/^- insert:\s*$/u.test(line)) {
        inInsert = true
        continue
      }
      if (/^- /u.test(line)) inInsert = false
      if (inInsert) {
        const match = /^ {4}- id: ([A-Za-z0-9_.-]+)/u.exec(line)
        if (match !== null) ids.push(match[1])
      }
    }
  }
  const manifest = readJson(join(packageDirectory, 'package.json'))
  const declared = manifest?.dsh?.bundle?.patch
  if (typeof declared === 'string' && declared !== '') {
    collect(join(packageDirectory, declared))
  }
  // The conventional location too: a package may ship cordis.patch.yml at
  // its root without declaring dsh.bundle.patch.
  collect(join(packageDirectory, 'cordis.patch.yml'))
  return ids
}

/**
 * The patch rows one installed plugin owns: its bundle patch's inserted
 * ids, falling back to the package name (the common `- id: <name>` shape).
 */
export function rowIdsForPackage(profileDirectory, packageName) {
  const ids = bundlePatchInsertedIds(join(profileDirectory, 'node_modules', packageName))
  if (ids.length > 0) return ids
  return [packageName]
}

/** True when the user patch layer disables any row the plugin owns. */
export function isPluginDisabled(profileDirectory, packageName) {
  const state = readPatchState(patchFilePath(profileDirectory))
  const disables = new Set(state.disables)
  return rowIdsForPackage(profileDirectory, packageName).some((id) => disables.has(id))
}

/** Serialize patch-file writes: concurrent toggles must not interleave. */
let writeQueue = Promise.resolve()
function queuedWrite(task) {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function rowBlock(rowId, disabled) {
  return `- id: ${rowId}\n  disabled: ${disabled ? 'true' : 'false'}\n`
}

/**
 * Append one top-level patch entry, keeping the file a valid entry list.
 * Handles the dsh template's empty `[]` placeholder and comment-only files;
 * refuses when the file ends in a top-level flow structure or is not a
 * valid entry list, so a broken patch layer is never made worse.
 */
export async function appendPatchEntry(patchPath, block) {
  let text = ''
  try {
    text = await readFile(patchPath, 'utf8')
  } catch {
    // created below
  }
  const core = text.trim()
  if (core === '') {
    await writeFile(patchPath, block)
    return { ok: true, reason: null }
  }
  const withoutComments = text.replace(/^[ \t]*#.*$/gmu, '').trim()
  if (withoutComments === '') {
    const next = text.endsWith('\n') ? text : `${text}\n`
    await writeFile(patchPath, `${next}${block}`)
    return { ok: true, reason: null }
  }
  if (withoutComments === '[]' || withoutComments === '[ ]') {
    const commented = text.replace(
      /^[ \t]*\[[ \t]*\][ \t]*(?:#.*)?(?:\r?\n|$)/mu,
      '# []\n'
    )
    const next = commented.endsWith('\n') ? commented : `${commented}\n`
    await writeFile(patchPath, `${next}${block}`)
    return { ok: true, reason: null }
  }
  const lastContentLine = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .pop() ?? ''
  if (/^[[{]/u.test(lastContentLine)) {
    return {
      ok: false,
      reason:
        'The patch layer ends in a top-level flow structure; refusing to append — tidy the file into an entry list first.',
    }
  }
  const next = text.endsWith('\n') ? text : `${text}\n`
  await writeFile(patchPath, `${next}${block}`)
  return { ok: true, reason: null }
}

/**
 * Remove every `- id: X` + `disabled: true|false` block the patch layer
 * carries for one row id (the blocks this surface may have written).
 */
async function removeRowBlocks(patchPath, rowId) {
  const blockRe = new RegExp(
    `^- id: ['"]?${escapeRegExp(rowId)}['"]?\\r?\\n  disabled: (?:true|false)\\r?\\n`,
    'gmu'
  )
  let text = ''
  try {
    text = await readFile(patchPath, 'utf8')
  } catch {
    return
  }
  if (!blockRe.test(text)) return
  const next = text.replace(blockRe, '')
  // Put the `[]` placeholder back when nothing else is left: a file of pure
  // comments is not a top-level array, and dsh refuses to boot the profile.
  const final =
    next.replace(/^[ \t]*#.*$/gmu, '').trim() === ''
      ? next.replace(/^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?:\r?\n|$)/mu, '[]\n')
      : next
  await writeFile(patchPath, final)
}

/**
 * Set one plugin's enabled state in the profile's user patch layer.
 * Disable removes any prior blocks then appends `disabled: true`
 * (idempotent); enable removes every block this surface wrote.
 * @returns `{ ok, reason }` — reason only on a refused write.
 */
export function setPluginEnabled(profileDirectory, packageName, enabled) {
  return queuedWrite(async () => {
    const rows = rowIdsForPackage(profileDirectory, packageName)
    const patchPath = patchFilePath(profileDirectory)
    for (const rowId of rows) {
      if (!ROW_ID_RE.test(rowId)) {
        return {
          ok: false,
          reason: `Row id ${rowId} cannot be written to the patch layer.`,
        }
      }
      if (enabled) {
        await removeRowBlocks(patchPath, rowId)
      } else {
        await removeRowBlocks(patchPath, rowId)
        const result = await appendPatchEntry(patchPath, rowBlock(rowId, true))
        if (!result.ok) return result
      }
    }
    return { ok: true, reason: null }
  })
}
