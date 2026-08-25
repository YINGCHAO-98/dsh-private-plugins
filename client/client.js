window.__ModuleLoader__.load({
  id: 'dsh-plugin-manager',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.pluginManager'
    const STATUS_PATH = '/dsh-plugin-manager/status'
    const REPOS_PATH = '/dsh-plugin-manager/repos'
    const REPOS_ADD_PATH = '/dsh-plugin-manager/repos/add'
    const REPOS_REMOVE_PATH = '/dsh-plugin-manager/repos/remove'
    const INSTALL_PATH = '/dsh-plugin-manager/install'
    const IMPORT_UPLOAD_PATH = '/dsh-plugin-manager/import-upload'
    const IMPORT_PATH_PATH = '/dsh-plugin-manager/import-path'
    const REMOVE_PATH = '/dsh-plugin-manager/remove'
    const UPDATES_PATH = '/dsh-plugin-manager/updates'

    const en = {
      tab: 'Plugin manager',
      intro: 'Import plugins from your private git repositories or from local files — all in one place.',
      repos: 'Private repositories',
      reposHint: 'Add your own git repositories (public or private). Installation uses this machine\'s git credentials, so private repos work once SSH keys or a credential helper are set up.',
      repoUrlPlaceholder: 'e.g. git@github.com:you/your-plugin.git or https://github.com/you/your-plugin',
      repoLabelPlaceholder: 'Label (optional)',
      repoAdd: 'Add repository',
      repoAdding: 'Adding…',
      repoEmpty: 'No repositories saved yet. Add one above to install a plugin from your own repo.',
      repoInstall: 'Install',
      repoInstalling: 'Installing…',
      repoRemove: 'Remove',
      repoRemoving: 'Removing…',
      repoCredsHint: 'Private repositories need working git credentials on this machine (SSH key or HTTPS token).',
      local: 'Local import',
      localHint: 'Upload an npm pack (.tgz / .tar.gz / .tar) of a plugin, or pick a local plugin folder directly.',
      upload: 'Upload archive',
      uploading: 'Uploading…',
      pickFolder: 'Pick local folder',
      pickingFolder: 'Picking…',
      noFolderPicker: 'Folder picking is only available in DSH Desktop (or a browser with folder upload support). Use the archive upload instead.',
      installed: 'Installed plugins',
      installedEmpty: 'No plugins installed yet.',
      remove: 'Remove',
      removing: 'Removing…',
      protectedTag: 'protected',
      bundleTag: 'bundle',
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
      updatesUpToDate: 'All installed plugins are up to date.',
      updatesCheck: 'Check for updates',
      updatesChecking: 'Checking…',
      updatesUpdate: 'Update',
      updatesUpdating: 'Updating…',
      updatesCurrent: 'current',
      updatesLatest: 'latest',
      updatesUnknown: 'Update status unknown (offline or private repo without credentials): ',
      updatesLocal: 'Local sources (file:/link:) are not checked.',
    }

    const zh = {
      tab: '插件管理',
      intro: '从你自己的私有 Git 仓库或本地文件导入插件——统一在一个界面里完成。',
      repos: '我的私有仓库',
      reposHint: '添加你自己的 Git 仓库（公开或私有）。安装走本机 git 凭据，配好 SSH key 或凭据后即可直接装私有仓库。',
      repoUrlPlaceholder: '例如 git@github.com:you/your-plugin.git 或 https://github.com/you/your-plugin',
      repoLabelPlaceholder: '备注名（可选）',
      repoAdd: '添加仓库',
      repoAdding: '添加中…',
      repoEmpty: '还没有保存任何仓库，先在上面添加一个，就可以从你自己的仓库安装插件。',
      repoInstall: '安装',
      repoInstalling: '安装中…',
      repoRemove: '移除',
      repoRemoving: '移除中…',
      repoCredsHint: '私有仓库需要本机可用的 git 凭据（SSH key 或 HTTPS token）。',
      local: '本地导入',
      localHint: '上传插件的 npm 打包产物（.tgz / .tar.gz / .tar），或直接选择本地插件文件夹。',
      upload: '上传压缩包',
      uploading: '上传中…',
      pickFolder: '选择本地文件夹',
      pickingFolder: '选择中…',
      noFolderPicker: '文件夹选择仅在 DSH Desktop（或支持文件夹上传的浏览器）中可用，请改用压缩包上传。',
      installed: '已安装插件',
      installedEmpty: '还没有安装插件。',
      remove: '移除',
      removing: '移除中…',
      protectedTag: '受保护',
      bundleTag: '配置层',
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
      updatesUpToDate: '所有已安装插件都是最新版本。',
      updatesCheck: '检查更新',
      updatesChecking: '检查中…',
      updatesUpdate: '更新',
      updatesUpdating: '更新中…',
      updatesCurrent: '当前',
      updatesLatest: '最新',
      updatesUnknown: '更新状态未知（离线或私有仓库无凭据）：',
      updatesLocal: '本地来源（file:/link:）不检查更新。',
    }

    const css = `
      .dshPm{box-sizing:border-box;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:18px}
      .dshPm h2{margin:0;font-size:20px;font-weight:600;line-height:30px}
      .dshPmIntro{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshPmCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px}
      .dshPmCardHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .dshPmCardTitle{margin:0;font-size:15px;font-weight:600;line-height:22px}
      .dshPmMuted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
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
      if (document.querySelector('style[data-plugin-css="dsh-plugin-manager"]')) return
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-plugin-manager'
      style.dataset.pluginCss = 'dsh-plugin-manager'
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

    function PrivateRepos({ repos, busy, t, onAdd, onInstall, onRemove }) {
      const [url, setUrl] = React.useState('')
      const [label, setLabel] = React.useState('')
      const [adding, setAdding] = React.useState(false)
      const [installingId, setInstallingId] = React.useState(null)
      const [removingId, setRemovingId] = React.useState(null)

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

      const install = async (repo) => {
        setInstallingId(repo.id)
        try {
          await onInstall(repo)
        } finally {
          setInstallingId(null)
        }
      }

      const remove = async (repo) => {
        setRemovingId(repo.id)
        try {
          await onRemove(repo)
        } finally {
          setRemovingId(null)
        }
      }

      return React.createElement(
        'div',
        { className: 'dshPmCard' },
        React.createElement('h3', { className: 'dshPmCardTitle' }, t('repos')),
        React.createElement('p', { className: 'dshPmHint' }, t('reposHint')),
        React.createElement(
          'div',
          { className: 'dshPmForm' },
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
        repos.length === 0
          ? React.createElement('p', { className: 'dshPmHint' }, t('repoEmpty'))
          : repos.map((repo) =>
              React.createElement(
                'div',
                { key: repo.id, className: 'dshPmRow' },
                React.createElement(
                  'div',
                  { className: 'dshPmRowMain' },
                  React.createElement(
                    'div',
                    { className: 'dshPmRowName' },
                    React.createElement('span', null, repo.label || repo.url)
                  ),
                  React.createElement('p', { className: 'dshPmMuted' }, repo.spec)
                ),
                React.createElement(
                  'div',
                  { className: 'dshPmActions' },
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshPmButton dshPmPrimary',
                      disabled: busy || installingId !== null || removingId !== null,
                      onClick: () => void install(repo),
                    },
                    installingId === repo.id ? t('repoInstalling') : t('repoInstall')
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshPmButton dshPmDanger',
                      disabled: busy || installingId !== null || removingId !== null,
                      onClick: () => void remove(repo),
                    },
                    removingId === repo.id ? t('repoRemoving') : t('repoRemove')
                  )
                )
              )
            ),
        React.createElement('p', { className: 'dshPmHint' }, t('repoCredsHint'))
      )
    }

    function UpdatesSection({ updates, busy, t, onCheck, onUpdate }) {
      const [checking, setChecking] = React.useState(false)
      const [updating, setUpdating] = React.useState(null)
      const list = updates?.updates || []
      const unknown = updates?.unknown || []
      if (!updates) return null

      const check = async () => {
        setChecking(true)
        try {
          await onCheck()
        } finally {
          setChecking(false)
        }
      }

      const update = async (item) => {
        setUpdating(item.name)
        try {
          await onUpdate(item)
        } finally {
          setUpdating(null)
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
              `${list.length} ${t('updatesAvailable')}`
            )
          : unknown.length === 0
            ? React.createElement('p', { className: 'dshPmHint' }, t('updatesUpToDate'))
            : null,
        list.map((item) =>
          React.createElement(
            'div',
            { key: item.name, className: 'dshPmRow' },
            React.createElement(
              'div',
              { className: 'dshPmRowMain' },
              React.createElement(
                'div',
                { className: 'dshPmRowName' },
                React.createElement('span', null, item.name)
              ),
              React.createElement(
                'p',
                { className: 'dshPmMuted' },
                `${t('updatesCurrent')}: ${item.current} → ${t('updatesLatest')}: ${item.latest}`
              )
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshPmButton dshPmPrimary',
                disabled: busy || updating !== null,
                onClick: () => void update(item),
              },
              updating === item.name ? t('updatesUpdating') : t('updatesUpdate')
            )
          )
        ),
        unknown.length > 0
          ? React.createElement(
              'p',
              { className: 'dshPmHint' },
              `${t('updatesUnknown')} ${unknown.join(', ')}`
            )
          : null,
        React.createElement('p', { className: 'dshPmHint' }, t('updatesLocal'))
      )
    }

    function LocalImport({ busy, t, onUpload, onPickFolder, canPickFolder }) {
      const fileRef = React.useRef(null)
      const [fileName, setFileName] = React.useState('')
      const [picking, setPicking] = React.useState(false)

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
        { className: 'dshPmCard' },
        React.createElement('h3', { className: 'dshPmCardTitle' }, t('local')),
        React.createElement('p', { className: 'dshPmHint' }, t('localHint')),
        React.createElement(
          'div',
          { className: 'dshPmActions' },
          React.createElement('input', {
            ref: fileRef,
            className: 'dshPmFile',
            type: 'file',
            accept: '.tgz,.tar,.tar.gz,application/gzip',
          }),
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
    }

    function InstalledList({ installed, busy, t, onRemove }) {
      const [removing, setRemoving] = React.useState(null)
      const remove = async (plugin) => {
        setRemoving(plugin.name)
        try {
          await onRemove(plugin.name)
        } finally {
          setRemoving(null)
        }
      }
      return React.createElement(
        'div',
        { className: 'dshPmCard' },
        React.createElement('h3', { className: 'dshPmCardTitle' }, t('installed')),
        installed.length === 0
          ? React.createElement('p', { className: 'dshPmHint' }, t('installedEmpty'))
          : installed.map((plugin) =>
              React.createElement(
                'div',
                { key: plugin.name, className: 'dshPmRow' },
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
                plugin.self
                  ? null
                  : React.createElement(
                      'button',
                      {
                        type: 'button',
                        className: 'dshPmButton dshPmDanger',
                        disabled: busy || removing !== null,
                        onClick: () => void remove(plugin),
                      },
                      removing === plugin.name ? t('removing') : t('remove')
                    )
              )
            )
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

      const removeRepo = async (repo) => {
        setError(undefined)
        try {
          await api(REPOS_REMOVE_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ id: repo.id }),
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
        } catch (failure) {
          onOperationError(failure)
        }
      }

      const updatePlugin = async (item) => {
        setError(undefined)
        try {
          const spec = item.kind === 'npm' ? `${item.name}@latest` : item.spec
          await api(INSTALL_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ spec }),
          })
          await loadStatus()
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

      return React.createElement(
        'section',
        { className: 'dshPm' },
        React.createElement('h2', null, t('tab')),
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
          onUpdate: updatePlugin,
        }),
        React.createElement(PrivateRepos, {
          repos,
          busy,
          t,
          onAdd: addRepo,
          onInstall: installRepo,
          onRemove: removeRepo,
        }),
        React.createElement(LocalImport, {
          busy,
          t,
          onUpload: upload,
          onPickFolder: pickFolder,
          canPickFolder,
        }),
        React.createElement(InstalledList, {
          installed: status?.installed || [],
          busy,
          t,
          onRemove: remove,
        }),
        restarting ? React.createElement(Spinner, { label: t('restarting') }) : null
      )
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      installStyles()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-plugin-manager: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          {
            name: 'settings.plugins.tab',
            id: 'plugin-manager',
            order: 35,
            label: () => t('tab'),
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
