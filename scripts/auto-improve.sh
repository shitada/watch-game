#!/bin/bash
# =============================================================================
# auto-improve.sh — 自動改善ループ
# =============================================================================
#
# 使い方:
#   ./scripts/auto-improve.sh [回数]
#
# 引数:
#   回数  改善ループの実行回数（デフォルト: 1）
#
# 例:
#   ./scripts/auto-improve.sh       # 1回実行
#   ./scripts/auto-improve.sh 3     # 3回ループ
#   ./scripts/auto-improve.sh 5     # 5回ループ
#
# 各イテレーションは独立したブランチで実行され、
# 成功すれば PR が自動作成されます。
# 1回のイテレーションが失敗しても次に進みます。
#
# =============================================================================

set -uo pipefail

# --- 引数処理 ---
ITERATIONS="${1:-1}"

if ! [[ "${ITERATIONS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "エラー: 回数は正の整数で指定してください (例: ./scripts/auto-improve.sh 3)"
  exit 1
fi

# --- 設定 ---
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- 色付き出力 ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✅${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠️${NC}  $1"; }
error() { echo -e "${RED}❌${NC} $1"; }

# --- 前提条件チェック ---
check_prerequisites() {
  info "前提条件を確認中..."

  if ! command -v copilot &> /dev/null; then
    error "copilot CLI がインストールされていません"
    exit 1
  fi

  if ! command -v gh &> /dev/null; then
    error "gh CLI がインストールされていません"
    exit 1
  fi

  if ! gh auth status &> /dev/null; then
    error "gh CLI が認証されていません (gh auth login を実行してください)"
    exit 1
  fi

  if ! git diff --quiet 2>/dev/null; then
    error "未コミットの変更があります。先にコミットまたはスタッシュしてください"
    exit 1
  fi

  ok "前提条件 OK"
}

# --- 1回のイテレーション ---
run_iteration() {
  local iteration_num="$1"
  local timestamp
  timestamp="$(date +%Y%m%d_%H%M%S)"
  local log_dir="${PROJECT_ROOT}/logs/auto-improve/${timestamp}"
  local branch_name="improve/${timestamp}"

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🔄 イテレーション ${iteration_num}/${ITERATIONS}                              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  # main ブランチに切り替え
  info "main ブランチに切り替え中..."
  git checkout main --quiet
  git pull --quiet origin main 2>/dev/null || true
  ok "main ブランチ最新"

  # ログディレクトリ作成
  mkdir -p "${log_dir}"
  ok "ログディレクトリ: ${log_dir}"

  # 新しいブランチ作成
  git checkout -b "${branch_name}" --quiet
  ok "ブランチ: ${branch_name}"

  # 環境情報を記録
  cat > "${log_dir}/00-environment.md" << EOF
# 環境情報

- **イテレーション**: ${iteration_num}/${ITERATIONS}
- **タイムスタンプ**: ${timestamp}
- **ブランチ**: ${branch_name}
- **ベースコミット**: $(git rev-parse HEAD)
- **Node.js**: $(node --version)
- **npm**: $(npm --version)
- **プロジェクト**: $(pwd)
EOF

  # オーケストレーター自動実行
  info "オーケストレーターを起動中..."

  local prompt
  prompt="@orchestrator 自動改善を実行してください。

環境情報:
- ログディレクトリ: ${log_dir}
- ブランチ: ${branch_name}
- プロジェクトルート: ${PROJECT_ROOT}"

  local exit_code=0
  copilot -p "${prompt}" --agent orchestrator --yolo 2>&1 | tee "${log_dir}/copilot-output.log" || exit_code=$?

  # コンソール出力を MD に変換
  cat > "${log_dir}/06-copilot-console.md" << MDEOF
# Copilot CLI コンソール出力

## 実行情報
- **タイムスタンプ**: ${timestamp}
- **ブランチ**: ${branch_name}
- **イテレーション**: ${iteration_num}/${ITERATIONS}
- **終了コード**: ${exit_code}

## コンソール出力

\`\`\`
$(cat "${log_dir}/copilot-output.log")
\`\`\`
MDEOF
  rm -f "${log_dir}/copilot-output.log"

  if [ "${exit_code}" -eq 0 ]; then
    ok "イテレーション ${iteration_num} 完了"
    return 0
  else
    error "イテレーション ${iteration_num} 失敗（終了コード: ${exit_code}）"
    return 1
  fi
}

# --- メイン処理 ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🕐 自動改善ループ — とけいマスター                   ║"
echo "║        実行回数: ${ITERATIONS}                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd "${PROJECT_ROOT}"
check_prerequisites

# イテレーション結果を記録
declare -a RESULTS=()
SUCCESS_COUNT=0
FAIL_COUNT=0

for i in $(seq 1 "${ITERATIONS}"); do
  if run_iteration "${i}"; then
    RESULTS+=("✅ #${i}")
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    RESULTS+=("❌ #${i}")
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # 次のイテレーションのために main に戻る
  git checkout main --quiet 2>/dev/null || true

  # イテレーション間に少し待つ（API レート制限対策）
  if [ "${i}" -lt "${ITERATIONS}" ]; then
    info "次のイテレーションまで 5 秒待機..."
    sleep 5
  fi
done

# --- サマリー ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    📊 実行サマリー                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
info "合計: ${ITERATIONS} 回 / 成功: ${SUCCESS_COUNT} / 失敗: ${FAIL_COUNT}"
echo ""
for result in "${RESULTS[@]}"; do
  echo "  ${result}"
done
echo ""

if [ "${FAIL_COUNT}" -eq 0 ]; then
  ok "全イテレーション成功！PR を確認してマージしてください。"
else
  warn "${FAIL_COUNT} 件のイテレーションが失敗しました。ログを確認してください。"
fi
echo ""
