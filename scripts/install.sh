#!/usr/bin/env bash
#
# dsh-private-plugins - one-click install / reinstall helper
# 一键安装 / 重装脚本：自动探测 DSH Desktop 当前 profile 与 dsh CLI。
#
# Usage / 用法:
#   ./scripts/install.sh                     interactive choice when several profiles exist
#   ./scripts/install.sh --all               install into every detected profile
#   ./scripts/install.sh --home <DSH_HOME>   install into a specific DSH_HOME (parent of profiles)
#   ./scripts/install.sh --profile <name>   install into a specific profile (default: active profile)
#   ./scripts/install.sh --reinstall         remove first if already installed, then reinstall
#   ./scripts/install.sh --check             print detected setup only, change nothing
#   ./scripts/install.sh --dsh <path>        point at a specific dsh executable
#   ./scripts/install.sh --remote             install directly from this GitHub repository
#   ./scripts/install.sh --source <spec>      install a custom npm/git/path spec
#
# After installing, restart Harness (Harness > Restart Harness) to activate.
# 装完后重启 Harness（菜单 Harness -> 重启 Harness）生效。
set -euo pipefail

if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  # curl .../install.sh | bash has no filesystem-backed BASH_SOURCE.
  SCRIPT_DIR="$PWD"
fi
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROFILE_NAME=""
PLUGIN_NAME="dsh-private-plugins"
REMOTE_SPEC="git+https://github.com/YINGCHAO-98/dsh-private-plugins.git"
PLUGIN_SOURCE="$PLUGIN_DIR"

MODE="interactive"   # interactive | all | check
REINSTALL=0
DSH_BIN=""
DSH_HOME_OVERRIDE=""

# DSH Desktop stores the selected profile outside DSH_HOME. Older releases
# used `web`, while current Desktop builds commonly select `desktop`.
detect_active_profile() {
  local state active
  for state in \
    "$HOME/Library/Application Support/DSH Desktop/profile-selection/state.json" \
    "$HOME/Library/Application Support/dsh-desktop/profile-selection/state.json" \
    "$HOME/Library/Application Support/dsh-desktop-dev/profile-selection/state.json"; do
    if [[ -f "$state" ]]; then
      active="$(sed -nE 's/.*"active"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$state" | head -n 1)"
      if [[ -n "$active" ]]; then
        echo "$active"
        return
      fi
    fi
  done
  echo "web"
}

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) MODE="all"; shift ;;
    --check) MODE="check"; shift ;;
    --reinstall) REINSTALL=1; shift ;;
    --home) DSH_HOME_OVERRIDE="$2"; shift 2 ;;
    --profile) PROFILE_NAME="$2"; shift 2 ;;
    --dsh) DSH_BIN="$2"; shift 2 ;;
    --remote) PLUGIN_SOURCE="$REMOTE_SPEC"; shift ;;
    --source) PLUGIN_SOURCE="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "unknown argument: $1" >&2; usage 1 ;;
  esac
done

# ---------- locate the dsh CLI ----------
detect_dsh() {
  if [[ -n "$DSH_BIN" ]]; then
    [[ -x "$DSH_BIN" ]] || { echo "error: --dsh file is not executable: $DSH_BIN" >&2; exit 1; }
    echo "$DSH_BIN"
    return
  fi
  local candidates=()
  # Prefer the CLI shipped in the currently installed Desktop app. Cached
  # launchers can retain stale app.asar paths after a Desktop upgrade.
  candidates+=("/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh/lib/bin.js")
  candidates+=("/Applications/DSH Desktop Dev.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh/lib/bin.js")
  candidates+=("$(dirname "$PLUGIN_DIR")/dsh-desktop/node_modules/.bin/dsh")
  candidates+=("$PLUGIN_DIR/node_modules/.bin/dsh")
  candidates+=("$PLUGIN_DIR/../node_modules/.bin/dsh")
  # Current macOS DSH Desktop bundles the CLI under a versioned directory
  # whose name is not stable between updates.
  local cli_dir c
  for cli_dir in \
    "$HOME/Library/Application Support/DSH Desktop/cli" \
    "$HOME/Library/Application Support/dsh-desktop/cli" \
    "$HOME/Library/Application Support/dsh-desktop-dev/cli"; do
    for c in "$cli_dir"/*/bin/dsh; do
      candidates+=("$c")
    done
  done
  for c in "${candidates[@]}"; do
    if [[ -x "$c" ]]; then
      echo "$c"
      return
    fi
  done
  local on_path
  on_path="$(command -v dsh 2>/dev/null || true)"
  if [[ -n "$on_path" ]]; then
    echo "$on_path"
    return
  fi
  echo ""
}

# ---------- locate existing profiles (macOS paths; Windows users pass --home) ----------
detect_homes() {
  local h
  if [[ -n "$DSH_HOME_OVERRIDE" && -d "$DSH_HOME_OVERRIDE/profiles/$PROFILE_NAME" ]]; then
    echo "$DSH_HOME_OVERRIDE"
    return
  fi
  if [[ -n "${DSH_HOME:-}" && -d "$DSH_HOME/profiles/$PROFILE_NAME" ]]; then
    echo "$DSH_HOME"
    return
  fi
  for h in \
    "$HOME/Library/Application Support/dsh-desktop/harness" \
    "$HOME/Library/Application Support/dsh-desktop-dev/harness" \
    "$HOME/.dsh"; do
    if [[ -d "$h/profiles/$PROFILE_NAME" ]]; then
      echo "$h"
    fi
  done
}

# The Desktop UI selection and the Harness on disk can temporarily disagree
# (notably Desktop 2.x may report "desktop" while launching profile "web").
# Prefer a profile that actually exists in a detected DSH_HOME.
resolve_profile_name() {
  if [[ -n "$PROFILE_NAME" ]]; then
    echo "$PROFILE_NAME"
    return
  fi
  local selected h
  selected="$(detect_active_profile)"

  # An explicit DSH_HOME wins. Otherwise prefer the Desktop-owned Harness
  # before ~/.dsh, because both can exist while only the former is running.
  for h in \
    "$DSH_HOME_OVERRIDE" \
    "${DSH_HOME:-}" \
    "$HOME/Library/Application Support/dsh-desktop/harness" \
    "$HOME/Library/Application Support/dsh-desktop-dev/harness"; do
    [[ -n "$h" ]] || continue
    if [[ -d "$h/profiles/$selected" ]]; then
      echo "$selected"
      return
    fi
    if [[ -d "$h/profiles/web" ]]; then
      echo "web"
      return
    fi
  done
  if [[ -d "$HOME/.dsh/profiles/$selected" ]]; then
    echo "$selected"
    return
  fi
  if [[ -d "$HOME/.dsh/profiles/web" ]]; then
    echo "web"
    return
  fi
  echo "$selected"
}

PROFILE_NAME="$(resolve_profile_name)"

installed_in() {
  local home="$1"
  [[ -f "$home/profiles/$PROFILE_NAME/package.json" ]] && \
    grep -q "\"$PLUGIN_NAME\"" "$home/profiles/$PROFILE_NAME/package.json"
}

run_install() {
  local home="$1"
  local dsh="$2"
  echo "==> installing into: $home/profiles/$PROFILE_NAME"
  if [[ "$REINSTALL" == "1" ]] && installed_in "$home"; then
    echo "==> already installed; removing first (--reinstall)"
    DSH_HOME="$home" CI=true NO_COLOR=1 "$dsh" plugin --profile "$PROFILE_NAME" remove "$PLUGIN_NAME" || true
  fi
  DSH_HOME="$home" CI=true NO_COLOR=1 "$dsh" plugin --profile "$PROFILE_NAME" add "$PLUGIN_SOURCE"
  if installed_in "$home"; then
    echo "==> OK: $PLUGIN_NAME installed into $home/profiles/$PROFILE_NAME"
  else
    echo "==> FAILED: $PLUGIN_NAME not found in manifest after install" >&2
    return 1
  fi
}

# ---------- main ----------
DSH_BIN="$(detect_dsh)"
if [[ -z "$DSH_BIN" ]]; then
  echo "error: dsh CLI not found. Pass --dsh <path> (e.g. dsh-desktop/node_modules/.bin/dsh)." >&2
  exit 1
fi
echo "dsh CLI   : $DSH_BIN"
echo "source    : $PLUGIN_SOURCE"

# The dsh CLI resolves pnpm from PATH. The profiles were built with the
# pnpm bundled next to dsh (dsh-desktop node_modules), so prepend that bin
# directory: a PATH pnpm from another source (corepack, a global v9, ...)
# would fail with ERR_PNPM_UNEXPECTED_STORE because its store layout differs.
DSH_BIN_DIR="$(dirname "$DSH_BIN")"
PNPM_SHIM_DIR=""
cleanup() {
  if [[ -n "$PNPM_SHIM_DIR" && -d "$PNPM_SHIM_DIR" ]]; then
    rm -rf "$PNPM_SHIM_DIR"
  fi
}
trap cleanup EXIT

# Desktop profiles must be managed with Desktop's pnpm major. A global dsh
# can otherwise pick pnpm 11 for node_modules created by pnpm 10 and fail with
# ERR_PNPM_UNEXPECTED_STORE. Put the app-bundled pnpm in a temporary PATH shim.
DESKTOP_PNPM=""
for candidate in \
  "/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/pnpm/bin/pnpm.cjs" \
  "/Applications/DSH Desktop Dev.app/Contents/Resources/app/node_modules/pnpm/bin/pnpm.cjs"; do
  if [[ -x "$candidate" ]]; then
    DESKTOP_PNPM="$candidate"
    break
  fi
done

if [[ -n "$DESKTOP_PNPM" ]]; then
  PNPM_SHIM_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dsh-private-plugins.XXXXXX")"
  ln -s "$DESKTOP_PNPM" "$PNPM_SHIM_DIR/pnpm"
  export PATH="$PNPM_SHIM_DIR:$PATH"
  echo "pnpm      : $DESKTOP_PNPM (Desktop bundled; compatibility shim)"
elif [[ -x "$DSH_BIN_DIR/pnpm" ]]; then
  export PATH="$DSH_BIN_DIR:$PATH"
  echo "pnpm      : $DSH_BIN_DIR/pnpm (bundled; prepended to PATH)"
else
  echo "pnpm      : $(command -v pnpm 2>/dev/null || echo 'not found on PATH')"
fi

if [[ "$MODE" == "check" ]]; then
  echo "--- detected DSH_HOMEs ---"
  homes=()
  while IFS= read -r h; do homes+=("$h"); done < <(detect_homes)
  if [[ ${#homes[@]} -eq 0 ]]; then
    echo "(no existing profile found; use --home <DSH_HOME> to specify one)"
  else
    for h in "${homes[@]}"; do
      if installed_in "$h"; then echo "  $h  [installed]"; else echo "  $h  [not installed]"; fi
    done
  fi
  exit 0
fi

TARGETS=()
if [[ -n "$DSH_HOME_OVERRIDE" ]]; then
  [[ -d "$DSH_HOME_OVERRIDE/profiles/$PROFILE_NAME" ]] || \
    { echo "error: $DSH_HOME_OVERRIDE/profiles/$PROFILE_NAME does not exist" >&2; exit 1; }
  TARGETS+=("$DSH_HOME_OVERRIDE")
elif [[ "$MODE" == "all" ]]; then
  while IFS= read -r h; do TARGETS+=("$h"); done < <(detect_homes)
  if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "error: no profile detected (use --home to specify one)" >&2
    exit 1
  fi
else
  while IFS= read -r h; do TARGETS+=("$h"); done < <(detect_homes)
  if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "error: no profile detected (use --home to specify one)" >&2
    exit 1
  elif [[ ${#TARGETS[@]} -eq 1 ]]; then
    echo "single profile detected; installing"
  else
    echo "multiple profiles detected; pick a DSH_HOME:"
    for i in "${!TARGETS[@]}"; do
      if installed_in "${TARGETS[$i]}"; then MARK="  [installed]"; else MARK=""; fi
      printf '  [%s] %s%s\n' "$((i+1))" "${TARGETS[$i]}" "$MARK"
    done
    echo "  [0] all"
    read -rp "choice (0-${#TARGETS[@]}): " choice || choice="0"
    if [[ "$choice" == "0" || -z "$choice" ]]; then
      :
    elif [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#TARGETS[@]} )); then
      picked=("${TARGETS[$((choice-1))]}")
      TARGETS=("${picked[@]}")
    else
      echo "invalid choice: $choice" >&2
      exit 1
    fi
  fi
fi

FAILED=0
for home in "${TARGETS[@]}"; do
  run_install "$home" "$DSH_BIN" || FAILED=1
done

if [[ "$FAILED" == "0" ]]; then
  echo ""
  echo "Done. Restart Harness (Harness > Restart Harness, or quit and reopen DSH Desktop),"
  echo "then open Settings > Private plugins. It appears next to Plugin market."
  echo "完成。请重启 Harness（菜单 Harness -> 重启 Harness，或退出重开 DSH Desktop），"
  echo "然后打开 设置 -> 私有插件；它会与 插件市场 并列显示。"
else
  exit 1
fi
