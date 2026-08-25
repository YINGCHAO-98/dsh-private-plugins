#!/usr/bin/env bash
#
# dsh-plugin-manager - one-click install / reinstall helper
# 一键安装 / 重装脚本：自动探测 DSH Desktop 的 web profile 与 dsh CLI。
#
# Usage / 用法:
#   ./scripts/install.sh                     interactive choice when several profiles exist
#   ./scripts/install.sh --all               install into every detected profile
#   ./scripts/install.sh --home <DSH_HOME>   install into a specific DSH_HOME (parent of profiles)
#   ./scripts/install.sh --reinstall         remove first if already installed, then reinstall
#   ./scripts/install.sh --check             print detected setup only, change nothing
#   ./scripts/install.sh --dsh <path>        point at a specific dsh executable
#
# After installing, restart Harness (Harness > Restart Harness) to activate.
# 装完后重启 Harness（菜单 Harness -> 重启 Harness）生效。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROFILE_NAME="web"
PLUGIN_NAME="dsh-plugin-manager"

MODE="interactive"   # interactive | all | check
REINSTALL=0
DSH_BIN=""
DSH_HOME_OVERRIDE=""

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
    --dsh) DSH_BIN="$2"; shift 2 ;;
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
  candidates+=("$(dirname "$PLUGIN_DIR")/dsh-desktop/node_modules/.bin/dsh")
  candidates+=("$PLUGIN_DIR/node_modules/.bin/dsh")
  candidates+=("$PLUGIN_DIR/../node_modules/.bin/dsh")
  local c
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
  for h in \
    "$HOME/Library/Application Support/dsh-desktop/harness" \
    "$HOME/Library/Application Support/dsh-desktop-dev/harness" \
    "$HOME/.dsh"; do
    if [[ -d "$h/profiles/$PROFILE_NAME" ]]; then
      echo "$h"
    fi
  done
}

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
  DSH_HOME="$home" CI=true NO_COLOR=1 "$dsh" plugin --profile "$PROFILE_NAME" add "$PLUGIN_DIR"
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
echo "plugin dir: $PLUGIN_DIR"

# The dsh CLI resolves pnpm from PATH. The profiles were built with the
# pnpm bundled next to dsh (dsh-desktop node_modules), so prepend that bin
# directory: a PATH pnpm from another source (corepack, a global v9, ...)
# would fail with ERR_PNPM_UNEXPECTED_STORE because its store layout differs.
DSH_BIN_DIR="$(dirname "$DSH_BIN")"
if [[ -x "$DSH_BIN_DIR/pnpm" ]]; then
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
  echo "then open Settings > Plugins > Plugin manager for the unified import UI."
  echo "完成。请重启 Harness（菜单 Harness -> 重启 Harness，或退出重开 DSH Desktop），"
  echo "然后打开 设置 -> 插件 -> 插件管理 使用统一导入界面。"
else
  exit 1
fi
