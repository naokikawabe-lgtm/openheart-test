#!/usr/bin/env bash
# OpenHeart 顧客提案資料 自動生成スクリプト
# 使い方: ./scripts/proposal.sh [顧客名] [提案テーマ]
#
# 例:
#   ./scripts/proposal.sh "株式会社ABC" "DX推進コンサルティング"
#   ./scripts/proposal.sh  # インタラクティブモード

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

CLIENT="${1:-}"
TOPIC="${2:-}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- 顧客データ収集 ---
collect_client_data() {
    local client_name="$1"
    log "顧客データを収集中: $client_name"
    local client_dir="$PROJECT_ROOT/data/clients"
    local client_files=""

    if [ -d "$client_dir" ] && [ "$(ls -A "$client_dir" 2>/dev/null)" ]; then
        # 顧客名でファイルを検索
        client_files=$(find "$client_dir" -name "*.md" -o -name "*.txt" | head -10)
        if [ -n "$client_name" ]; then
            local specific=$(grep -rl "$client_name" "$client_dir" 2>/dev/null | head -5)
            [ -n "$specific" ] && client_files="$specific"
        fi
    fi
    echo "$client_files"
}

# --- 関連戦略の取得 ---
collect_strategy_data() {
    log "関連戦略文書を収集中..."
    local strategies_dir="$PROJECT_ROOT/strategies"
    if [ -d "$strategies_dir" ] && [ "$(ls -A "$strategies_dir" 2>/dev/null)" ]; then
        # 最新の戦略文書を取得
        find "$strategies_dir" -name "*.md" | sort -r | head -3
    fi
}

# --- プロンプト構築 ---
build_prompt() {
    local client_files="$1"
    local strategy_files="$2"

    cat <<PROMPT
あなたはOpenHeart株式会社の営業コンサルタントです。
顧客向けの提案資料を作成してください。

## 指示
- 顧客名: ${CLIENT:-"（顧客名を指定してください）"}
- 提案テーマ: ${TOPIC:-"（テーマを指定してください）"}
- テンプレート（templates/proposal.md）の構造に従って出力してください
- プレースホルダー（{{...}}）を全て具体的な内容に置き換えてください
- 必ず以下を含めてください:
  - 背景・課題認識（顧客視点）
  - 具体的なソリューション提案
  - 定量的な期待効果
  - 実現可能なスケジュール
  - 概算費用
- 専門用語は避け、顧客にとってわかりやすい表現を使ってください
- OpenHeartの強みを自然に織り込んでください

## 利用可能なデータ
PROMPT

    if [ -n "$client_files" ]; then
        echo "### 顧客データ"
        echo "$client_files" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
    else
        echo "### 顧客データ"
        echo "※ data/clients/ にデータがありません。一般的な企業を想定してください。"
    fi
    echo ""

    if [ -n "$strategy_files" ]; then
        echo "### 参照戦略文書"
        echo "$strategy_files" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
        echo ""
        echo "上記の戦略文書と整合性のある提案を作成してください。"
    fi
}

# --- 実行 ---
main() {
    log "=== OpenHeart 提案資料生成 開始 ==="
    log "顧客: ${CLIENT:-未指定}"
    log "テーマ: ${TOPIC:-未指定}"

    # データ収集
    client_files=$(collect_client_data "${CLIENT:-}")
    strategy_files=$(collect_strategy_data)

    # プロンプト構築
    local prompt_file="$PROJECT_ROOT/actions/${TIMESTAMP}_proposal_prompt.md"
    build_prompt "$client_files" "$strategy_files" > "$prompt_file"
    log "プロンプトを生成: $prompt_file"

    # 出力先（顧客名をファイル名に含める）
    local safe_client=$(echo "${CLIENT:-proposal}" | tr ' ' '_' | tr -cd 'a-zA-Z0-9_-')
    local output_file="$PROJECT_ROOT/proposals/${DATE}_${safe_client}.md"

    # Claude Code呼び出し
    if command -v claude &> /dev/null; then
        log "Claude Codeで提案資料を生成中..."
        claude -p "$(cat "$prompt_file")" \
            --output "$output_file" \
            2>/dev/null || {
            log "Claude CLI実行に失敗。プロンプトファイルを確認してください: $prompt_file"
            return 1
        }
    else
        log "Claude CLIが見つかりません。"
        log "以下のプロンプトをClaude Codeに貼り付けて実行してください:"
        log "プロンプトファイル: $prompt_file"
        log "出力先: $output_file"
        cat "$prompt_file"
        return 0
    fi

    log "提案資料を生成完了: $output_file"

    # summary.md更新
    update_summary "提案資料" "$output_file"

    log ""
    log "次のステップ:"
    log "  1. Markdownの内容を確認・修正"
    log "  2. ./scripts/slide-gen.sh $output_file でPPTX生成"
    log "  3. deliverables/ にMarkdownとPPTXのペアで管理"
    log "=== 提案資料生成 完了 ==="
}

update_summary() {
    local doc_type="$1"
    local output="$2"
    local summary_file="$PROJECT_ROOT/summary.md"

    if [ -f "$summary_file" ]; then
        local filename
        filename=$(basename "$output")
        local new_row="| $DATE | $filename | $doc_type | $output |"
        if grep -q "^| 日付 | 成果物" "$summary_file"; then
            sed -i "/^| [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} .* | .*$/a $new_row" "$summary_file" 2>/dev/null || true
        fi
        sed -i "s/^\*\*最終更新\*\*:.*/\*\*最終更新\*\*: $DATE/" "$summary_file" 2>/dev/null || true
        log "summary.md を更新しました"
    fi
}

main "$@"
