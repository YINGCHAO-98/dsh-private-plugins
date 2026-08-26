# dsh-plugin-manager

本地与私有插件：在 **设置** 侧栏新增独立的「本地与私有插件」入口（与「插件市场」并列），把 **从自己的私有 Git 仓库安装插件** 与 **本地插件导入** 放在同一个界面，并附带已安装插件的查看/移除。

- 我的私有仓库：添加你自己拥有的 Git 仓库（公开或私有），一键 `git clone` 安装；仓库列表持久化在 profile 里，随时复用。私有仓库的访问完全取决于本机 git 凭据（SSH key / credential helper / token），与普通 `git clone` 一致。
- 本地导入：
  - 上传 `.tgz / .tar.gz / .tar` 压缩包（浏览器通用，`npm pack` 产物可直接上传）；
  - 选择本地插件文件夹（DSH Desktop 原生目录选择器，或支持文件夹上传的浏览器）。
- 已安装列表：仅显示由本页从私有仓库或本地导入的插件（不重复显示插件市场已安装项），显示版本、来源 spec、是否为配置层 bundle，可移除。
- 所有变更通过 `dsh plugin --profile <p> add|remove <spec>` 执行，与 DSH Desktop / dsh-market 同一安装链路；完成后提示重启 Harness 生效（桌面版提供一键重启按钮）。

## 安装

### 一键脚本（推荐）

```sh
./dsh-plugin-manager/scripts/install.sh            # 有多个 profile 时交互选择
./dsh-plugin-manager/scripts/install.sh --all      # 装进所有检测到的 profile
./dsh-plugin-manager/scripts/install.sh --check    # 只打印检测结果
./dsh-plugin-manager/scripts/install.sh --reinstall   # 已安装则先移除再重装
./dsh-plugin-manager/scripts/install.sh --home <DSH_HOME>   # 指定 DSH_HOME
```

脚本会自动探测 dsh CLI（优先用相邻的 `dsh-desktop/node_modules/.bin/dsh`）和 macOS 上常见的 profile（正式版 `dsh-desktop`、dev 版 `dsh-desktop-dev`、`~/.dsh`）。Windows 请用 `--home` 指定 DSH_HOME。

### 手动命令

```sh
# 把本目录当作一个本地插件包装进 web profile
dsh plugin --profile web add /absolute/path/to/dsh-plugin-manager

# 或发布到 npm 后按包名安装
dsh plugin --profile web add dsh-plugin-manager
```

DSH Desktop 使用 `web` profile（`$DSH_HOME/profiles/web`，默认 `~/.dsh`），装完后从菜单 **Harness → 重启 Harness** 生效。打开 **设置 → 本地与私有插件** 即可使用；安装了 `dsh-market` 时，该入口紧随「插件市场」。

## 私有仓库支持

界面支持以下地址写法（添加时自动归一化为 pnpm 的 git spec）：

| 输入 | 归一化结果 |
|---|---|
| `https://github.com/you/repo` | `git+https://github.com/you/repo.git` |
| `git@github.com:you/repo.git` | `git+ssh://git@github.com/you/repo.git` |
| `github:you/repo` | `github:you/repo`（原样，pnpm 简写） |
| `git+https://…` / `git+ssh://…` | 原样 |
| `git+file:///…` | 原样（本地 git 仓库，用于测试） |

- 分支/标签：在地址后追加 `#分支名`（如 `git+https://github.com/you/repo.git#main`）。
- 私有仓库凭据：安装走本机 `git`，与你在终端 `git clone` 使用同一套凭据——SSH key（`git@…` / `git+ssh://`）、HTTPS token（`https://`，配合 credential helper）或全局 git 配置。
- 仓库列表保存在 `<profile>/.dsh-plugin-manager/repos.json`，重启后仍在。

## 更新提醒

打开「本地与私有插件」页面会自动检查由本页管理的插件更新（结果缓存 1 小时，可点「检查更新」强制刷新）；插件市场安装的项目仅在「插件市场」内显示：

- **npm 来源**（registry 安装）：查询本机配置的 npm registry（`npm_config_registry`，默认 npmjs.org）的 `dist-tags.latest`，与已装版本比较。
- **git 来源**（私有仓库）：对比 `pnpm-lock.yaml` 里记录的已解析 commit 与 `git ls-remote` 的远端 HEAD/分支 commit。私有仓库若本机凭据不可用，显示「更新状态未知」，**不会误报**。
- **本地来源**（`file:` / `link:`）：不检查。
- 有新版时页面顶部列出「当前 → 最新」并一键更新（npm 装 `name@latest`，git 重新拉取该分支），完成后提示重启 Harness 生效。

## 安全说明

- 所有会改动 profile 的 HTTP 路由只接受 **回环 + 同源** 请求（`isTrustedRequest`）。
- 云端安装 spec 有白名单校验（npm 名/github: 源），上传文件名被清洗，路径导入要求绝对路径且拒绝指向 profile 自身。
- 本地安装会执行 pnpm/`dsh plugin`，属于特权操作：只导入可信来源的插件（插件的 `cordis.patch.yml` / `client.js` 会获得与主进程同等的执行权限）。

## 目录结构

```text
dsh-plugin-manager/
├── package.json          # dsh.bundle（配置层）+ dsh.client（浏览器端入口）
├── cordis.patch.yml      # 把插件行插入配置树
├── lib/                  # 宿主端（Node）
│   ├── index.js          # apply(ctx) + HTTP 路由 + 操作编排
│   ├── profile.js        # profile 解析与已安装清单
│   ├── dsh.js            # 重新调用 dsh CLI（超时/进程树清理）
│   ├── repos.js          # 私有仓库地址归一化/校验 + repos.json 持久化
│   └── validate.js       # spec/文件名/路径校验 + HTTP 工具
├── client/client.js      # 浏览器端 UI（零构建 ModuleLoader 格式）
├── scripts/install.sh    # 一键安装/重装脚本（自动探测 profile 与 dsh CLI）
└── test/                 # node:test 单元测试
```

## 开发与测试

```sh
node --test test/
```

浏览器端 `client.js` 是手写的 `window.__ModuleLoader__.load({ id, factory })` 格式，无需构建；宿主端为纯 ESM、零运行时依赖。
