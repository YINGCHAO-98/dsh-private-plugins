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

/** Read a safe row id from an optionally quoted YAML `id` scalar. */
function rowIdFromLine(line, indent = '') {
  const match = new RegExp(
    `^${indent}- id: ['\"]?([A-Za-z0-9_.-]+)['\"]?(?:\\s+#.*)?\\s*$`,
    'u'
  ).exec(line)
  return match?.[1]
}

/**
 * Line-wise scan of the patch layer — what the user layer says about each
 * row id. Deliberately not a full YAML parse: only a top-level `id` entry
 * and its top-level `disabled` property matter here, and the file may hold
 * structures our dialect rejects.
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
      const insertRow = rowIdFromLine(line, '    ')
      if (insertRow !== undefined) inserts.push(insertRow)
      continue
    }
    const disableRow = rowIdFromLine(line)
    if (disableRow === undefined) continue
    let disabled
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const next = lines[nextIndex] ?? ''
      if (/^- /u.test(next)) break
      const match = /^ {2}disabled: (true|false)(?:\s+#.*)?\s*$/u.exec(next)
      if (match !== null) disabled = match[1]
    }
    if (disabled === 'true') disables.push(disableRow)
    else if (disabled === 'false') forced.push(disableRow)
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
        const id = rowIdFromLine(line, '    ')
        if (id !== undefined) ids.push(id)
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
  return [...new Set(ids)]
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
 * Remove the top-level `disabled` property from every patch entry aimed at
 * one row id. A target may also carry a config override, so it is not safe to
 * assume `disabled` is the line immediately following `id` or to delete the
 * entire entry. Empty entries created by this surface are removed too.
 */
async function removeRowBlocks(patchPath, rowId) {
  let text = ''
  try {
    text = await readFile(patchPath, 'utf8')
  } catch {
    return
  }
  const lines = text.split(/(?<=\n)/u)
  const idRe = new RegExp(
    `^- id: ['"]?${escapeRegExp(rowId)}['"]?(?:\\s+#.*)?\\s*(?:\\r?\\n|$)`,
    'u'
  )
  const disabledRe = /^ {2}disabled: (?:true|false)(?:\s+#.*)?\s*(?:\r?\n|$)/u
  let changed = false
  const nextLines = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!idRe.test(line)) {
      nextLines.push(line)
      continue
    }

    const entry = [line]
    index += 1
    while (index < lines.length && !/^- /u.test(lines[index])) {
      entry.push(lines[index])
      index += 1
    }
    index -= 1

    let removedFromEntry = false
    const withoutDisabled = entry.filter((entryLine) => {
      if (!disabledRe.test(entryLine)) return true
      changed = true
      removedFromEntry = true
      return false
    })
    const hasProperties = withoutDisabled.slice(1).some((entryLine) => {
      const trimmed = entryLine.trim()
      return trimmed !== '' && !trimmed.startsWith('#')
    })
    if (hasProperties || !removedFromEntry) {
      nextLines.push(...withoutDisabled)
    } else {
      // Drop the bare id row left after removing a manager-owned disable.
      changed = true
    }
  }
  if (!changed) return
  const next = nextLines.join('')
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
 * Disable removes any prior disabled setting then appends `disabled: true`
 * (idempotent); enable clears disabled settings while preserving other
 * configuration in the same patch entry.
 * @returns `{ ok, reason, disabled? }` — reason only when the write did not apply.
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
    const disabled = isPluginDisabled(profileDirectory, packageName)
    if (disabled !== !enabled) {
      return {
        ok: false,
        reason: `The patch layer did not ${enabled ? 'enable' : 'disable'} ${packageName}.`,
      }
    }
    return { ok: true, reason: null, disabled }
  })
}
