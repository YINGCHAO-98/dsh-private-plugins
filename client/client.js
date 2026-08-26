window.__ModuleLoader__.load({
  id: 'dsh-private-plugins',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.pluginManager'
    const STATUS_PATH = '/dsh-private-plugins/status'
    const REPOS_PATH = '/dsh-private-plugins/repos'
    const REPOS_ADD_PATH = '/dsh-private-plugins/repos/add'
    const INSTALL_PATH = '/dsh-private-plugins/install'
    const IMPORT_UPLOAD_PATH = '/dsh-private-plugins/import-upload'
    const IMPORT_PATH_PATH = '/dsh-private-plugins/import-path'
    const REMOVE_PATH = '/dsh-private-plugins/remove'
    const TOGGLE_PATH = '/dsh-private-plugins/toggle'
    const UPDATES_PATH = '/dsh-private-plugins/updates'

    const en = {
      nav: 'Private plugins',
      intro: 'Import plugins from your private git repositories or from local files — all in one place.',
      reposHint: 'Add your own git repositories (public or private). Installation uses this machine\'s git credentials, so private repos work once SSH keys or a credential helper are set up.',
      repoUrlPlaceholder: 'e.g. git@github.com:you/your-plugin.git or https://github.com/you/your-plugin',
      repoLabelPlaceholder: 'Custom name (optional; defaults to repository name)',
      repoAdd: 'Add repository',
      repoAdding: 'Adding…',
      repoCredsHint: 'Private repositories need working git credentials on this machine (SSH key or HTTPS token).',
      localHint: 'Upload an npm pack (.tgz / .tar.gz / .tar) of a plugin, or pick a local plugin folder directly.',
      upload: 'Upload archive',
      uploading: 'Uploading…',
      pickFolder: 'Pick local folder',
      pickingFolder: 'Picking…',
      noFolderPicker: 'Folder picking is only available in DSH Desktop (or a browser with folder upload support). Use the archive upload instead.',
      installed: 'Installed plugins',
      installedEmpty: 'No plugins installed yet.',
      installedHint: 'Local imports and cloud installs from your private repositories, managed market-style.',
      protectedTag: 'protected',
      bundleTag: 'bundle',
      install: 'Install',
      installing: 'Installing…',
      pendingUpdate: 'Update available',
      updating: 'Updating…',
      updatedBtn: 'Updated',
      unknownBtn: 'Unknown',
      uninstall: 'Uninstall',
      uninstalling: 'Uninstalling…',
      sourceLocal: 'local',
      sourceCloud: 'repo',
      importSource: 'Import source',
      importSourceHint: 'Private repositories and local files are just import methods — every plugin is managed in the Installed plugins list below.',
      repoSection: 'Cloud repository',
      localSection: 'Local files',
      enabledTag: 'On',
      disabledTag: 'Off',
      enable: 'Enable',
      disable: 'Disable',
      busy: 'An operation is running — this can take a few minutes. Keep the app open.',
      restartHint: 'Restart Harness to activate changes.',
      restart: 'Restart Harness',
      restarting: 'Restarting…',
      restartViaMenu: 'Restart Harness from the Harness menu (not available from the page).',
      lastOk: 'Done: ',
      lastFailed: 'Failed: ',
      idle: 'Idle.',
      hostStale: 'The host is still running an older version (the new /repos routes are missing). Restart Harness and reopen this page.',
      hostStaleRestart: 'Restart Harness',
      updates: 'Updates',
      updatesAvailable: 'update(s) available',
      updatesUpToDate: 'No plugins awaiting an update.',
      updatesCheck: 'Check for updates',
      updatesChecking: 'Checking…',
      updatesInlineHint: 'update them from the rows below.',
    }

    const zh = {
      nav: '私有插件',
      intro: '从你自己的私有 Git 仓库或本地文件导入插件——统一在一个界面里完成。',
      reposHint: '添加你自己的 Git 仓库（公开或私有）。安装走本机 git 凭据，配好 SSH key 或凭据后即可直接装私有仓库。',
      repoUrlPlaceholder: '例如 git@github.com:you/your-plugin.git 或 https://github.com/you/your-plugin',
      repoLabelPlaceholder: '自定义名称（可选，默认使用仓库名）',
      repoAdd: '添加仓库',
      repoAdding: '添加中…',
      repoCredsHint: '私有仓库需要本机可用的 git 凭据（SSH key 或 HTTPS token）。',
      localHint: '上传插件的 npm 打包产物（.tgz / .tar.gz / .tar），或直接选择本地插件文件夹。',
      upload: '上传压缩包',
      uploading: '上传中…',
      pickFolder: '选择本地文件夹',
      pickingFolder: '选择中…',
      noFolderPicker: '文件夹选择仅在 DSH Desktop（或支持文件夹上传的浏览器）中可用，请改用压缩包上传。',
      installed: '已安装插件',
      installedEmpty: '还没有安装插件。',
      installedHint: '本地导入与从私有仓库安装的云端插件统一在此管理（参考插件市场）。',
      protectedTag: '受保护',
      bundleTag: '配置层',
      install: '安装',
      installing: '安装中…',
      pendingUpdate: '待更新',
      updating: '更新中…',
      updatedBtn: '已更新',
      unknownBtn: '未知',
      uninstall: '卸载',
      uninstalling: '卸载中…',
      sourceLocal: '本地',
      sourceCloud: '仓库',
      importSource: '导入方式',
      importSourceHint: '私有仓库与本地文件都只是导入方式；所有插件统一在下方「已安装插件」中管理。',
      repoSection: '云端仓库',
      localSection: '本地文件',
      enabledTag: '已启用',
      disabledTag: '已停用',
      enable: '启用',
      disable: '停用',
      busy: '正在执行插件操作，可能需要几分钟，请保持应用打开。',
      restartHint: '重启 Harness 后生效。',
      restart: '重启 Harness',
      restarting: '重启中…',
      restartViaMenu: '请从 Harness 菜单重启（页面内不可用）。',
      lastOk: '已完成：',
      lastFailed: '失败：',
      idle: '空闲。',
      hostStale: '宿主端仍在运行旧版本（新的 /repos 路由未加载）。请重启 Harness 后重新打开本页。',
      hostStaleRestart: '重启 Harness',
      updates: '更新提醒',
      updatesAvailable: '个插件可更新',
      updatesUpToDate: '暂无待更新插件。',
      updatesCheck: '检查更新',
      updatesChecking: '检查中…',
      updatesInlineHint: '可在下方各行直接更新。',
    }

    const css = `
      .dshPm{box-sizing:border-box;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:18px}
      .dshPm h2{margin:0;font-size:20px;font-weight:600;line-height:30px}
      .dshPmIntro{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshPmCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:14px}
      .dshPmCardHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .dshPmCardTitle{margin:0;font-size:15px;font-weight:600;line-height:22px}
      .dshPmMuted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow-wrap:anywhere;word-break:break-word}
      .dshPmStatus{display:flex;flex-direction:column;gap:6px;padding:10px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
      .dshPmBusy{display:flex;align-items:center;gap:9px}
      .dshPmSpinner{box-sizing:border-box;width:15px;height:15px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-primary);border-radius:50%;animation:dshPmSpin .75s linear infinite}
      @keyframes dshPmSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){.dshPmSpinner{animation:none}}
      .dshPmOk{color:var(--dsw-alias-state-success-primary)}
      .dshPmError{color:var(--dsw-alias-state-error-primary)}
      .dshPmRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dshPmRow:last-child{border-bottom:none}
      .dshPmRowMain{min-width:0;display:flex;flex-direction:column;gap:3px}
      .dshPmRowName{font-size:14px;font-weight:600;line-height:20px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .dshPmTag{font-size:11px;line-height:16px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary)}
      .dshPmTagAccent{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
      .dshPmImportList{display:flex;flex-direction:column;gap:14px}
      .dshPmImportCard{min-width:0;gap:12px}
      .dshPmImportBlock{display:flex;flex-direction:column;gap:10px;min-width:0}
      .dshPmImportForm{flex-wrap:wrap}
      .dshPmInstalled{display:flex;flex-direction:column;gap:12px}
      .dshPmInstalledHead{display:flex;flex-direction:column;gap:4px}
      .dshPmPluginGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .dshPmPluginCard{box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:border-color .16s,box-shadow .16s,transform .16s}
      .dshPmPluginCard:hover{border-color:var(--dsw-alias-border-l3);box-shadow:var(--dsw-shadow-lv1);transform:translateY(-1px)}
      .dshPmPluginFooter{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      @media (max-width:620px){.dshPmPluginGrid{grid-template-columns:1fr}}
      .dshPmRowDesc{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:19px;overflow-wrap:anywhere}
      .dshPmButton{box-sizing:border-box;height:32px;padding:0 14px;border:1px solid transparent;border-radius:16px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
      .dshPmPrimary{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill)}
      .dshPmPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
      .dshPmSecondary{color:var(--dsw-alias-label-primary);background:transparent;border-color:var(--dsw-alias-border-l3)}
      .dshPmSecondary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshPmDanger{color:var(--dsw-alias-state-error-primary);background:transparent;border-color:var(--dsw-alias-border-l3)}
      .dshPmDanger:hover:not(:disabled){background:var(--dsw-alias-state-error-secondary)}
      .dshPmButton:disabled{cursor:default;opacity:.5}
      .dshPmButton:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
      .dshPmInput{box-sizing:border-box;flex:1 1 240px;height:36px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;min-width:0}
      .dshPmInput:focus{outline:none;border-color:var(--dsw-alias-border-l3)}
      .dshPmInputSmall{flex:0 1 180px}
      .dshPmForm{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .dshPmFile{display:none}
      .dshPmHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px}
      .dshPmActions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .dshPmLink{color:var(--dsw-alias-label-secondary);border-radius:6px;padding:4px;font-size:12px;line-height:18px;text-decoration:none}
      .dshPmLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}
      .dshPmDetail{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;overflow-wrap:anywhere}
    `

    function installStyles() {
      if (document.querySelector('style[data-plugin-css="dsh-private-plugins"]')) return
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-private-plugins'
      style.dataset.pluginCss = 'dsh-private-plugins'
      style.textContent = css
      document.head.appendChild(style)
    }

    async function api(path, options) {
      const response = await fetch(path, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        // non-JSON body
      }
      if (!response.ok) {
        const failure = new Error(payload?.error || `HTTP ${response.status}`)
        failure.status = response.status
        throw failure
      }
      return payload
    }

    function Spinner({ label }) {
      return React.createElement(
        'span',
        { className: 'dshPmBusy', role: 'status' },
        React.createElement('span', { className: 'dshPmSpinner', 'aria-hidden': 'true' }),
        React.createElement('span', { className: 'dshPmMuted' }, label)
      )
    }

    function StatusStrip({ status, t, onRestart }) {
      const operation = status?.lastOperation
      const busy = status?.busy
      const elements = []
      if (busy) {
        elements.push(React.createElement(Spinner, { key: 'busy', label: t('busy') }))
      } else if (operation) {
        const failed = !operation.ok
        elements.push(
          React.createElement(
            'div',
            { key: 'last' },
            React.createElement(
              'span',
              { className: failed ? 'dshPmError' : 'dshPmOk' },
              failed ? t('lastFailed') : t('lastOk')
            ),
            ' ',
            React.createElement('span', null, operation.label),
            operation.added?.length > 0
              ? React.createElement('span', { className: 'dshPmMuted' }, ` — ${operation.added.join(', ')}`)
              : null,
            operation.detail
              ? React.createElement(
                  'p',
                  { className: 'dshPmDetail' },
                  operation.detail
                )
              : null
          )
        )
        if (operation.ok && operation.restartRequired) {
          elements.push(
            React.createElement(
              'div',
              { key: 'restart', className: 'dshPmActions' },
              React.createElement('span', { className: 'dshPmMuted' }, t('restartHint')),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshPmButton dshPmPrimary',
                  onClick: () => void onRestart(),
                },
                t('restart')
              )
            )
          )
        }
      } else {
        elements.push(
          React.createElement('span', { key: 'idle', className: 'dshPmMuted' }, t('idle'))
        )
      }
      return React.createElement('div', { className: 'dshPmStatus' }, ...elements)
    }

    /** True for a locally imported plugin spec (file:/link:/absolute path). */
    function isLocalSpec(spec) {
      return (
        typeof spec === 'string' &&
        (spec.startsWith('file:') || spec.startsWith('link:') || spec.startsWith('/'))
      )
    }

    /**
     * A spec reduced to its repository identity: protocol prefixes, the
     * trailing .git and any #ref fragment removed. Two specs sharing an
     * identity are the same repository, whatever branch was saved.
     */
    function specIdentity(spec) {
      if (typeof spec !== 'string' || spec === '') return ''
      const hash = spec.indexOf('#')
      const base = hash === -1 ? spec : spec.slice(0, hash)
      return base.replace(/^git\+/, '').replace(/\.git$/, '')
    }

    /** The installed plugin entry matching a repo spec, if any. */
    function findInstalledBySpec(spec, installed) {
      if (typeof spec !== 'string' || spec === '') return undefined
      const target = specIdentity(spec)
      return installed.find((plugin) => {
        if (plugin.spec === spec) return true
        return target !== '' && specIdentity(plugin.spec) === target
      })
    }

    /**
     * The market-style status of a plugin row:
     *   notInstalled   – not installed (repo saved but never installed)
     *   updated        – just updated this boot, restart applies it
     *   updateAvailable– installed, a newer remote revision exists
     *   unknown        – installed, but updates cannot be checked
     *   installed      – installed and current
     */
    function pluginState(plugin, byName, updatedNames) {
      if (!plugin) return 'notInstalled'
      if (updatedNames.includes(plugin.name)) return 'updated'
      const info = byName?.[plugin.name]
      if (!info) return 'unknown'
      if (info.available) return 'updateAvailable'
      // Old hosts/caches do not include `known`; an absent latest value is
      // not evidence that a Git/local source was actually checked.
      const known = info.known === true || (info.known === undefined && info.latest !== undefined)
      if (!known) return 'unknown'
      return 'installed'
    }

    /** The install spec that fetches the newest remote revision of a plugin. */
    function updateSpecOf(plugin) {
      const spec = plugin?.spec
      if (typeof spec !== 'string' || spec === '') return spec
      // An npm name/range spec — "dsh-x", "dsh-x@^1.0.0", or a bare
      // version range / dist-tag ("^1.2.3", "next") recorded under the
      // plugin's own name — updates to @latest. Git and local specs pass
      // through so pnpm re-resolves the same source.
      const npmSpec = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:@[^\s/]+)?$/.test(spec)
      const versionOrTag =
        /^[~^]?(?:[0-9]+(?:\.[0-9x]+)*(?:[-+][0-9A-Za-z.-]+)?|[A-Za-z][0-9A-Za-z.-]*)$/.test(spec)
      return npmSpec || versionOrTag ? `${plugin.name}@latest` : spec
    }

    /** A standard action button, avoiding a custom switch visual. */
    function EnableButton({ plugin, busy, active, t, onToggle }) {
      if (typeof plugin.disabled !== 'boolean') return null
      const off = plugin.disabled
      return React.createElement(
        'button',
        {
          type: 'button',
          className: off ? 'dshPmButton dshPmPrimary' : 'dshPmButton dshPmSecondary',
          disabled: busy || active !== null,
          onClick: () => onToggle(plugin, !off),
        },
        off ? t('enable') : t('disable')
      )
    }

    /**
     * The market-style action buttons of one plugin row:
     *   install              — 安装 a saved cloud repository;
     *   update state           — 待更新、已更新或未知; 待更新可直接执行更新;
     *   uninstall            — for every installed row.
     * `active` is this row's own in-flight action ('install' | 'update' |
     * 'remove' | null), used for the in-progress labels.
     */
    function PluginButtons({ state, busy, active, t, onInstall, onUpdate, onRemove }) {
      const disabled = busy || active !== null
      const buttons = []
      if (state === 'notInstalled' && typeof onInstall === 'function') {
        buttons.push(
          React.createElement(
            'button',
            {
              type: 'button',
              key: 'install',
              className: 'dshPmButton dshPmPrimary',
              disabled,
              onClick: onInstall,
            },
            active === 'install' ? t('installing') : t('install')
          )
        )
      }
      if (state === 'updateAvailable' && typeof onUpdate === 'function') {
        buttons.push(
          React.createElement(
            'button',
            {
              type: 'button',
              key: 'update',
              className: 'dshPmButton dshPmPrimary',
              disabled,
              onClick: onUpdate,
            },
            active === 'update' ? t('updating') : t('pendingUpdate')
          )
        )
      } else if (state !== 'notInstalled') {
        buttons.push(
          React.createElement(
            'button',
            {
              type: 'button',
              key: 'updated',
              className: 'dshPmButton dshPmSecondary',
              disabled: true,
            },
            state === 'unknown' ? t('unknownBtn') : t('updatedBtn')
          )
        )
      }
      if (state !== 'notInstalled' && typeof onRemove === 'function') {
        buttons.push(
          React.createElement(
            'button',
            {
              type: 'button',
              key: 'remove',
              className: 'dshPmButton dshPmDanger',
              disabled,
              onClick: onRemove,
            },
            active === 'remove' ? t('uninstalling') : t('uninstall')
          )
        )
      }
      return React.createElement('div', { className: 'dshPmActions' }, ...buttons)
    }

    /**
     * The import-source card has two stacked import methods. No plugin lists
     * live here; every plugin is managed in the Installed plugins list below.
     */
    function ImportSource({ busy, t, onAdd, onUpload, onPickFolder, canPickFolder }) {
      const [url, setUrl] = React.useState('')
      const [label, setLabel] = React.useState('')
      const [adding, setAdding] = React.useState(false)
      const [picking, setPicking] = React.useState(false)
      const [fileName, setFileName] = React.useState('')
      const fileRef = React.useRef(null)

      const add = async () => {
        if (!url.trim()) return
        setAdding(true)
        try {
          await onAdd(url.trim(), label.trim())
          setUrl('')
          setLabel('')
        } finally {
          setAdding(false)
        }
      }

      const upload = async () => {
        let file = fileRef.current?.files?.[0]
        if (!file) {
          fileRef.current?.click()
          return
        }
        setFileName(file.name)
        try {
          await onUpload(file)
        } finally {
          fileRef.current.value = ''
          setFileName('')
        }
      }

      const pickFolder = async () => {
        setPicking(true)
        try {
          await onPickFolder()
        } finally {
          setPicking(false)
        }
      }

      return React.createElement(
        'div',
        { className: 'dshPmImportList' },
        React.createElement(
          'section',
          { className: 'dshPmCard dshPmImportCard' },
          React.createElement(
            'div',
            { className: 'dshPmImportBlock' },
            React.createElement('h3', { className: 'dshPmCardTitle' }, t('repoSection')),
            React.createElement('p', { className: 'dshPmHint' }, t('reposHint')),
            React.createElement(
              'div',
              { className: 'dshPmForm dshPmImportForm' },
              React.createElement('input', {
                className: 'dshPmInput',
                type: 'text',
                placeholder: t('repoUrlPlaceholder'),
                value: url,
                disabled: busy || adding,
                onChange: (event) => setUrl(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') void add() },
              }),
              React.createElement('input', {
                className: 'dshPmInput dshPmInputSmall',
                type: 'text',
                placeholder: t('repoLabelPlaceholder'),
                value: label,
                disabled: busy || adding,
                onChange: (event) => setLabel(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') void add() },
              }),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshPmButton dshPmPrimary',
                  disabled: busy || adding || !url.trim(),
                  onClick: () => void add(),
                },
                adding ? t('repoAdding') : t('repoAdd')
              )
            ),
            React.createElement('p', { className: 'dshPmHint' }, t('repoCredsHint'))
          )
        ),
        React.createElement(
          'section',
          { className: 'dshPmCard dshPmImportCard' },
          React.createElement(
            'div',
            { className: 'dshPmImportBlock' },
            React.createElement('h3', { className: 'dshPmCardTitle' }, t('localSection')),
            React.createElement('p', { className: 'dshPmHint' }, t('localHint')),
            React.createElement('input', {
              ref: fileRef,
              className: 'dshPmFile',
              type: 'file',
              accept: '.tgz,.tar,.tar.gz,application/gzip',
            }),
            React.createElement(
              'div',
              { className: 'dshPmActions' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshPmButton dshPmPrimary',
                  disabled: busy || picking,
                  onClick: () => void upload(),
                },
                t('upload')
              ),
              canPickFolder
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshPmButton dshPmSecondary',
                      disabled: busy || picking,
                      onClick: () => void pickFolder(),
                    },
                    picking ? t('pickingFolder') : t('pickFolder')
                  )
                : null
            ),
            fileName !== ''
              ? React.createElement('span', { className: 'dshPmMuted' }, fileName)
              : null,
            !canPickFolder
              ? React.createElement('p', { className: 'dshPmHint' }, t('noFolderPicker'))
              : null
          )
        )
      )
    }

    function UpdatesSection({ updates, busy, t, onCheck }) {
      const [checking, setChecking] = React.useState(false)
      const list = updates?.updates || []
      if (!updates) return null

      const check = async () => {
        setChecking(true)
        try {
          await onCheck()
        } finally {
          setChecking(false)
        }
      }

      return React.createElement(
        'div',
        { className: 'dshPmCard' },
        React.createElement(
          'div',
          { className: 'dshPmCardHead' },
          React.createElement('h3', { className: 'dshPmCardTitle' }, t('updates')),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dshPmButton dshPmSecondary',
              disabled: busy || checking,
              onClick: () => void check(),
            },
            checking ? t('updatesChecking') : t('updatesCheck')
          )
        ),
        list.length > 0
          ? React.createElement(
              'p',
              { className: 'dshPmRowDesc dshPmOk' },
              `${list.length} ${t('updatesAvailable')} — ${t('updatesInlineHint')}`
            )
          : React.createElement('p', { className: 'dshPmHint' }, t('updatesUpToDate'))
      )
    }

    /**
     * The single management list, rendered as individual marketplace-style
     * cards. It contains local imports and private-repository installs, plus
     * saved repositories that have not been installed yet.
     */
    function InstalledList({ rows, busy, t, onInstall, onUpdate, onRemove, onToggle }) {
      const [busyRow, setBusyRow] = React.useState(null)
      const run = async (action, row, key) => {
        setBusyRow({ key, action })
        try {
          if (action === 'install') await onInstall(row)
          else if (action === 'update') await onUpdate(row)
          else if (action === 'remove') await onRemove(row)
        } finally {
          setBusyRow(null)
        }
      }
      const toggle = async (plugin, enabled, key) => {
        setBusyRow({ key, action: 'toggle' })
        try {
          await onToggle(plugin, enabled)
        } finally {
          setBusyRow(null)
        }
      }
      return React.createElement(
        'section',
        { className: 'dshPmInstalled' },
        React.createElement(
          'header',
          { className: 'dshPmInstalledHead' },
          React.createElement('h3', { className: 'dshPmCardTitle' }, t('installed')),
          React.createElement('p', { className: 'dshPmHint' }, t('installedHint'))
        ),
        rows.length === 0
          ? React.createElement('p', { className: 'dshPmHint' }, t('installedEmpty'))
          : React.createElement('div', { className: 'dshPmPluginGrid' }, rows.map((row) => {
              const plugin = row.plugin
              const state = row.state
              const local = isLocalSpec(plugin.spec)
              const key = `${plugin.name}|${plugin.spec}`
              const active =
                busyRow !== null && busyRow.key === key ? busyRow.action : null
              return React.createElement(
                'article',
                { key, className: 'dshPmPluginCard' },
                React.createElement(
                  'div',
                  { className: 'dshPmRowMain' },
                  React.createElement(
                    'div',
                    { className: 'dshPmRowName' },
                    React.createElement('span', null, plugin.name),
                    plugin.version
                      ? React.createElement('span', { className: 'dshPmMuted' }, plugin.version)
                      : null,
                    React.createElement(
                      'span',
                      { className: 'dshPmTag' },
                      local ? t('sourceLocal') : t('sourceCloud')
                    ),
                    plugin.disabled === true
                      ? React.createElement('span', { className: 'dshPmTag' }, t('disabledTag'))
                      : null,
                    plugin.self
                      ? React.createElement('span', { className: 'dshPmTag dshPmTagAccent' }, t('protectedTag'))
                      : null,
                    plugin.bundle
                      ? React.createElement('span', { className: 'dshPmTag' }, t('bundleTag'))
                      : null
                  ),
                  plugin.description
                    ? React.createElement('p', { className: 'dshPmRowDesc' }, plugin.description)
                    : null,
                  React.createElement('p', { className: 'dshPmMuted' }, plugin.spec)
                ),
                React.createElement(
                  'div',
                  { className: 'dshPmPluginFooter' },
                  plugin.self
                    ? null
                    : React.createElement(EnableButton, {
                        plugin,
                        busy,
                        active,
                        t,
                        onToggle: (target, enabled) => void toggle(target, enabled, key),
                      }),
                  plugin.self
                    ? null
                    : React.createElement(PluginButtons, {
                        state,
                        busy,
                        active,
                        t,
                        onInstall: () => void run('install', row, key),
                        onUpdate: () => void run('update', row, key),
                        onRemove: () => void run('remove', row, key),
                      })
                )
              )
            }))
      )
    }

    function PluginManagerPage({ t }) {
      const [status, setStatus] = React.useState()
      const [repos, setRepos] = React.useState([])
      const [updates, setUpdates] = React.useState()
      const [error, setError] = React.useState()
      const [hostStale, setHostStale] = React.useState(false)
      const [restarting, setRestarting] = React.useState(false)
      const busy = status?.busy === true

      const loadStatus = React.useCallback(async () => {
        try {
          const next = await api(STATUS_PATH)
          setStatus(next)
          setError(undefined)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }, [])

      const loadRepos = React.useCallback(async () => {
        try {
          const next = await api(REPOS_PATH)
          setRepos(next.repos || [])
          setHostStale(false)
        } catch (failure) {
          if (failure?.status === 404 || failure?.status === 405) {
            setHostStale(true)
          }
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }, [])

      const refreshUpdates = React.useCallback(async (force) => {
        try {
          const next = await api(force ? `${UPDATES_PATH}?force=1` : UPDATES_PATH)
          setUpdates(next)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }, [])

      React.useEffect(() => {
        void loadStatus()
        void loadRepos()
        void refreshUpdates(false)
      }, [loadStatus, loadRepos, refreshUpdates])

      // Poll while an operation is in flight; re-read everything when it settles.
      React.useEffect(() => {
        if (!busy) return
        let disposed = false
        let timer
        const poll = async () => {
          try {
            const next = await api(STATUS_PATH)
            if (disposed) return
            setStatus(next)
            setError(undefined)
            if (next.busy) timer = setTimeout(poll, 850)
            else void refreshUpdates(false)
          } catch (failure) {
            if (disposed) return
            setError(failure instanceof Error ? failure.message : String(failure))
            timer = setTimeout(poll, 1_500)
          }
        }
        timer = setTimeout(poll, 850)
        return () => {
          disposed = true
          clearTimeout(timer)
        }
      }, [busy, refreshUpdates])

      const onOperationError = (failure) => {
        setError(failure instanceof Error ? failure.message : String(failure))
        void loadStatus()
      }

      const addRepo = async (url, label) => {
        setError(undefined)
        try {
          await api(REPOS_ADD_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ url, label: label || undefined }),
          })
          await loadRepos()
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const installRepo = async (repo) => {
        setError(undefined)
        try {
          await api(INSTALL_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ spec: repo.spec }),
          })
          await loadStatus()
          void refreshUpdates(true)
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const updatePlugin = async (name, spec) => {
        setError(undefined)
        try {
          await api(INSTALL_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ name, spec, update: true }),
          })
          await loadStatus()
          void refreshUpdates(true)
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const upload = async (file) => {
        setError(undefined)
        try {
          await api(IMPORT_UPLOAD_PATH, {
            method: 'POST',
            headers: { 'x-plugin-filename': file.name, accept: 'application/json' },
            body: file,
          })
          await loadStatus()
          void refreshUpdates(true)
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const pickFolder = async () => {
        const bridge = window.dshDesktopDirectoryPicker
        if (!bridge || typeof bridge.pick !== 'function') {
          setError('Folder picker bridge unavailable.')
          return
        }
        setError(undefined)
        try {
          const picked = await bridge.pick()
          const path = typeof picked === 'string' ? picked : picked?.path
          if (typeof path !== 'string' || path === '') {
            setError('No folder selected.')
            return
          }
          await api(IMPORT_PATH_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ path }),
          })
          await loadStatus()
          void refreshUpdates(true)
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const remove = async (pluginName) => {
        setError(undefined)
        try {
          await api(REMOVE_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ name: pluginName }),
          })
          await loadStatus()
          void refreshUpdates(true)
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const toggleByName = async (pluginName, enabled) => {
        setError(undefined)
        try {
          await api(TOGGLE_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ name: pluginName, enabled }),
          })
          await loadStatus()
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const restart = async () => {
        const bridge = globalThis.dshDesktop
        if (!bridge || typeof bridge.restartHarness !== 'function') {
          setError(t('restartViaMenu'))
          return
        }
        setRestarting(true)
        setError(undefined)
        try {
          await bridge.restartHarness()
        } catch (failure) {
          setRestarting(false)
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const canPickFolder =
        typeof window.dshDesktopDirectoryPicker?.pick === 'function'

      const installed = status?.installed || []
      const byName = updates?.byName || {}
      const lastOperation = status?.lastOperation
      const updatedNames =
        lastOperation && lastOperation.ok === true && Array.isArray(lastOperation.updated)
          ? lastOperation.updated
          : []

      // One management list: installed plugins (local + cloud) plus saved
      // repositories that are not installed yet — those rows carry the
      // Install button, exactly like the market's catalog.
      const rows = [
        ...installed.map((plugin) => ({
          plugin,
          state: pluginState(plugin, byName, updatedNames),
        })),
        ...repos
          .filter((repo) => !findInstalledBySpec(repo.spec, installed))
          .map((repo) => ({
            plugin: {
              name: repo.label || repo.spec,
              spec: repo.spec,
              version: undefined,
              description: undefined,
              bundle: false,
              self: false,
              disabled: undefined,
              repo,
            },
            state: 'notInstalled',
          })),
      ]

      return React.createElement(
        'section',
        { className: 'dshPm' },
        React.createElement('h2', null, t('nav')),
        React.createElement('p', { className: 'dshPmIntro' }, t('intro')),
        hostStale
          ? React.createElement(
              'div',
              { className: 'dshPmStatus' },
              React.createElement('span', { className: 'dshPmError' }, t('hostStale')),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshPmButton dshPmPrimary',
                  disabled: restarting,
                  onClick: () => void restart(),
                },
                restarting ? t('restarting') : t('hostStaleRestart')
              )
            )
          : null,
        error
          ? React.createElement('p', { className: 'dshPmDetail dshPmError' }, error)
          : null,
        React.createElement(StatusStrip, { status, t, onRestart: restart }),
        React.createElement(UpdatesSection, {
          updates,
          busy,
          t,
          onCheck: () => refreshUpdates(true),
        }),
        React.createElement(ImportSource, {
          busy,
          t,
          onAdd: addRepo,
          onUpload: upload,
          onPickFolder: pickFolder,
          canPickFolder,
        }),
        React.createElement(InstalledList, {
          rows,
          busy,
          t,
          onInstall: (row) => installRepo(row.plugin.repo ?? { spec: row.plugin.spec }),
          onUpdate: (row) => updatePlugin(row.plugin.name, updateSpecOf(row.plugin)),
          onRemove: (row) => remove(row.plugin.name),
          onToggle: (plugin, enabled) => toggleByName(plugin.name, enabled),
        }),
        restarting ? React.createElement(Spinner, { label: t('restarting') }) : null
      )
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      installStyles()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-private-plugins: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'private-plugins',
            // Keep this immediately after dsh-market (order 40) when it is
            // installed, while remaining a clear first-class entry on its own.
            order: 41,
            label: () => t('nav'),
            inject: () => ({ t }),
          },
          PluginManagerPage
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
