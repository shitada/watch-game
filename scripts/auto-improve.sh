#!/bin/bash
# =============================================================================
# auto-improve.sh — 自動改善ループ（単一ブランチ方式）
# =============================================================================
#
# 使い方:
#   ./scripts/auto-improve.sh
#
# ループ開始時に 1 つのブランチを作成し、各イテレーションの変更を
# 同一ブランチにコミット & プッシュします。
#
# Ctrl+C で停止すると、PR を自動作成して終了します。
#
# =============================================================================

set -uo pipefail

# --- 設定 ---
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COPILOT_TIMEOUT_SEC=1800  # copilot CLI の最大実行時間（秒）= 30分
COPILOT_PID=""
BRANCH_NAME=""             # セッション全体で使うブランチ名
TIMESTAMP=""               # セッション開始タイムスタンプ
LOG_BASE_DIR=""            # ログのベースディレクトリ
ITERATION_NUM=0
SUCCESS_COUNT=0
FAIL_COUNT=0
HAS_COMMITS=false          # ブランチに新規コミットがあるか

# --- 色付き出力 ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✅${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠️${NC}  $1"; }
error() { echo -e "${RED}❌${NC} $1"; }
url()   { echo -e "${CYAN}🌐${NC} $1"; }

# --- プレビュー URL を生成 ---
get_preview_url() {
  local safe_branch
  safe_branch="$(echo "${BRANCH_NAME}" | sed 's|/|-|g')"
  echo "https://shitada.github.io/watch-game/preview/${safe_branch}/"
}

# --- PR 作成 & 終了 ---
create_pr_and_exit() {
  local sig="${1:-UNKNOWN}"
  echo ""
  warn "シグナル ${sig} を受信。PR 作成中..."

  # copilot プロセスが残っていれば終了
  if [[ -n "${COPILOT_PID}" ]] && kill -0 "${COPILOT_PID}" 2>/dev/null; then
    kill "${COPILOT_PID}" 2>/dev/null || true
    wait "${COPILOT_PID}" 2>/dev/null || true
    warn "copilot プロセス (PID: ${COPILOT_PID}) を終了しました"
  fi

  # 未コミットの変更があればコミット
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    info "未コミットの変更をコミット中..."
    git add -A
    git commit -m "chore: auto-improve 中断時の未コミット変更" --quiet 2>/dev/null || true
    HAS_COMMITS=true
  fi

  # main との差分がない場合はブランチを削除して終了
  if [[ "${HAS_COMMITS}" != "true" ]]; then
    warn "変更がないため、ブランチを削除して終了します"
    git checkout main --quiet 2>/dev/null || true
    git branch -D "${BRANCH_NAME}" --quiet 2>/dev/null || true
    git push origin --delete "${BRANCH_NAME}" --quiet 2>/dev/null || true
    print_summary
    exit 130
  fi

  # 最終プッシュ
  info "最終プッシュ中..."
  git push origin "${BRANCH_NAME}" --quiet 2>/dev/null || true

  # PR 本文を生成
  local preview_url
  preview_url="$(get_preview_url)"
  local diff_stat
  diff_stat="$(git diff --stat main..."${BRANCH_NAME}" 2>/dev/null || echo '(差分取得失敗)')"
  local commit_log
  commit_log="$(git log main.."${BRANCH_NAME}" --oneline 2>/dev/null || echo '(ログ取得失敗)')"

  local pr_body
  pr_body="## 🚀 自動改善セッション

**ブランチ**: \`${BRANCH_NAME}\`
**イテレーション**: ${ITERATION_NUM} 回 (成功: ${SUCCESS_COUNT} / 失敗: ${FAIL_COUNT})

### 🌐 プレビュー
${preview_url}

iPad Safari で実機テストできます。

### 📊 変更サマリー
\`\`\`
${diff_stat}
\`\`\`

### 📝 コミット一覧
\`\`\`
${commit_log}
\`\`\`
"

  # PR 作成
  info "PR を作成中..."
  local pr_url
  pr_url="$(gh pr create \
    --title "🤖 Auto-improve: $(date '+%Y/%m/%d %H:%M')" \
    --body "${pr_body}" \
    --base main \
    --head "${BRANCH_NAME}" \
    --label "auto-improve" 2>&1)" || true

  if [[ "${pr_url}" == http* ]]; then
    ok "PR 作成完了: ${pr_url}"
  else
    # ラベルが存在しない場合はラベルなしで再試行
    pr_url="$(gh pr create \
      --title "🤖 Auto-improve: $(date '+%Y/%m/%d %H:%M')" \
      --body "${pr_body}" \
      --base main \
      --head "${BRANCH_NAME}" 2>&1)" || true
    if [[ "${pr_url}" == http* ]]; then
      ok "PR 作成完了: ${pr_url}"
    else
      warn "PR 作成に失敗しました: ${pr_url}"
      info "手動で作成してください: gh pr create --base main --head ${BRANCH_NAME}"
    fi
  fi

  # main に戻る
  git checkout main --quiet 2>/dev/null || true

  print_summary
  exit 0
}

# --- サマリー出力 ---
print_summary() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                    📊 セッションサマリー                    ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  info "ブランチ: ${BRANCH_NAME}"
  info "イテレーション: ${ITERATION_NUM} 回 / 成功: ${SUCCESS_COUNT} / 失敗: ${FAIL_COUNT}"
  if [[ "${HAS_COMMITS}" == "true" ]]; then
    url "プレビュー: $(get_preview_url)"
  fi
  echo ""
}

trap 'create_pr_and_exit INT' INT
trap 'create_pr_and_exit TERM' TERM

# --- GitHub Pages 設定を gh-pages ブランチに切り替え ---
ensure_pages_config() {
  local build_type
  build_type="$(gh api repos/shitada/watch-game/pages --jq '.build_type' 2>/dev/null || echo 'unknown')"

  if [[ "${build_type}" == "legacy" ]]; then
    ok "GitHub Pages は gh-pages ブランチから配信中"
    return
  fi

  info "GitHub Pages を gh-pages ブランチ配信に切り替え中..."

  # gh-pages ブランチが存在しない場合は作成
  if ! git ls-remote --heads origin gh-pages 2>/dev/null | grep -q .; then
    info "gh-pages ブランチを初期化中..."
    git checkout --orphan gh-pages --quiet
    git rm -rf . --quiet 2>/dev/null || true
    echo "# GitHub Pages" > README.md
    git add README.md
    git commit -m "chore: initialize gh-pages branch" --quiet
    git push origin gh-pages --quiet
    git checkout main --quiet
    ok "gh-pages ブランチを作成しました"
  fi

  # Pages 設定を変更
  gh api repos/shitada/watch-game/pages \
    -X PUT \
    -f "source[branch]=gh-pages" \
    -f "source[path]=/" \
    --silent 2>/dev/null || warn "Pages 設定の自動変更に失敗。GitHub Settings > Pages で gh-pages ブランチを選択してください"

  ok "GitHub Pages 設定を更新しました"
}

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
  local iter_timestamp
  iter_timestamp="$(date +%Y%m%d_%H%M%S)"
  local log_dir="${LOG_BASE_DIR}/${iter_timestamp}"

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🔄 イテレーション #${iteration_num}                                       ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  # ログディレクトリ作成
  mkdir -p "${log_dir}"

  # 環境情報を記録
  cat > "${log_dir}/00-environment.md" << EOF
# 環境情報

- **イテレーション**: #${iteration_num}
- **タイムスタンプ**: ${iter_timestamp}
- **ブランチ**: ${BRANCH_NAME}
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
- ブランチ: ${BRANCH_NAME}
- プロジェクトルート: ${PROJECT_ROOT}"

  local exit_code=0
  # タイムアウト付きで copilot を実行（ハング防止）
  copilot -p "${prompt}" --agent orchestrator --yolo 2>&1 | tee "${log_dir}/copilot-output.log" &
  COPILOT_PID=$!

  # watchdog: バックグラウンドでタイムアウト監視
  (
    sleep "${COPILOT_TIMEOUT_SEC}"
    if kill -0 "${COPILOT_PID}" 2>/dev/null; then
      kill "${COPILOT_PID}" 2>/dev/null || true
    fi
  ) &
  local watchdog_pid=$!

  wait "${COPILOT_PID}" || exit_code=$?
  COPILOT_PID=""

  # watchdog を停止
  kill "${watchdog_pid}" 2>/dev/null || true
  wait "${watchdog_pid}" 2>/dev/null || true

  # SIGTERM による終了は 143 (128 + 15)
  if [ "${exit_code}" -eq 143 ]; then
    exit_code=124
    error "copilot CLI がタイムアウトしました（${COPILOT_TIMEOUT_SEC}秒）"
  fi

  # コンソール出力を MD に変換
  cat > "${log_dir}/05-copilot-console.md" << MDEOF
# Copilot CLI コンソール出力

## 実行情報
- **タイムスタンプ**: ${iter_timestamp}
- **ブランチ**: ${BRANCH_NAME}
- **イテレーション**: #${iteration_num}
- **終了コード**: ${exit_code}

## コンソール出力

\`\`\`
$(cat "${log_dir}/copilot-output.log")
\`\`\`
MDEOF
  rm -f "${log_dir}/copilot-output.log"

  # 未コミットの変更があればコミット
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    info "未コミットの変更をコミット中..."
    git add -A
    git commit -m "feat: auto-improve iteration #${iteration_num}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" --quiet 2>/dev/null || true
    HAS_COMMITS=true
  fi

  # 未プッシュのコミットがあればプッシュ（Coder が直接コミットした分も含む）
  local unpushed
  unpushed="$(git log "origin/${BRANCH_NAME}..HEAD" --oneline 2>/dev/null || echo "")"
  if [[ -n "${unpushed}" ]]; then
    info "変更をプッシュ中..."
    git push origin "${BRANCH_NAME}" --quiet 2>/dev/null || true
    HAS_COMMITS=true
    ok "プッシュ完了 — Actions でプレビューデプロイ開始"
    url "プレビュー: $(get_preview_url)"
  else
    info "このイテレーションでは変更なし"
  fi

  if [ "${exit_code}" -eq 0 ]; then
    ok "イテレーション #${iteration_num} 完了"
    return 0
  else
    error "イテレーション #${iteration_num} 失敗（終了コード: ${exit_code}）"
    return 1
  fi
}

# --- メイン処理 ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🕐 自動改善ループ — とけいマスター                   ║"
echo "║        モード: 単一ブランチ (Ctrl+C で PR 作成)              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd "${PROJECT_ROOT}"
check_prerequisites

# GitHub Pages 設定を確認・更新
ensure_pages_config

# main ブランチに切り替え & 最新化
info "main ブランチを最新化中..."
git checkout main --quiet
git pull --quiet origin main 2>/dev/null || true
ok "main ブランチ最新"

# セッション用ブランチを作成（1回だけ）
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BRANCH_NAME="improve/${TIMESTAMP}"
LOG_BASE_DIR="${PROJECT_ROOT}/logs/auto-improve/${TIMESTAMP}"
mkdir -p "${LOG_BASE_DIR}"

git checkout -b "${BRANCH_NAME}" --quiet
git push -u origin "${BRANCH_NAME}" --quiet 2>/dev/null || true
ok "ブランチ: ${BRANCH_NAME}"

# プレビュー URL を表示
echo ""
url "プレビュー: $(get_preview_url)"
info "※ Actions のデプロイ完了後にアクセス可能（2〜3分）"
echo ""

# 無限ループ
while true; do
  ITERATION_NUM=$((ITERATION_NUM + 1))

  if run_iteration "${ITERATION_NUM}"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # イテレーション間に少し待つ（API レート制限対策）
  info "次のイテレーションまで 5 秒待機..."
  sleep 5
done
