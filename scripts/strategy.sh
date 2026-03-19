#!/usr/bin/env bash
# OpenHeart 経営戦略立案 自動化スクリプト
# 使い方: ./scripts/strategy.sh [テーマ] [対象期間]
#
# 例:
#   ./scripts/strategy.sh "AI事業の拡大戦略" "2026年度下半期"
#   ./scripts/strategy.sh  # インタラクティブモード

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

THEME="${1:-}"
PERIOD="${2:-}"

# --- ユーティリティ ---
log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- データ収集 ---
collect_market_data() {
    log "市場データを収集中..."
    local market_dir="$PROJECT_ROOT/data/market"
    local market_files=""
    if [ -d "$market_dir" ] && [ "$(ls -A "$market_dir" 2>/dev/null)" ]; then
        market_files=$(find "$market_dir" -name "*.md" -o -name "*.txt" -o -name "*.csv" | head -20)
    fi
    echo "$market_files"
}

collect_internal_data() {
    log "社内データを収集中..."
    local reports_dir="$PROJECT_ROOT/data/reports"
    local report_files=""
    if [ -d "$reports_dir" ] && [ "$(ls -A "$reports_dir" 2>/dev/null)" ]; then
        report_files=$(find "$reports_dir" -name "*.md" -o -name "*.txt" | head -20)
    fi
    echo "$report_files"
}

collect_minutes_data() {
    log "議事録データを収集中..."
    local minutes_dir="$PROJECT_ROOT/data/minutes"
    local minutes_files=""
    if [ -d "$minutes_dir" ] && [ "$(ls -A "$minutes_dir" 2>/dev/null)" ]; then
        minutes_files=$(find "$minutes_dir" -name "*.md" -o -name "*.txt" | head -20)
    fi
    echo "$minutes_files"
}

# --- メインプロンプト構築 ---
build_prompt() {
    local market_files="$1"
    local internal_files="$2"
    local minutes_files="$3"

    cat <<PROMPT
あなたはOpenHeart株式会社の経営コンサルタントです。
以下のデータを分析し、経営戦略書を作成してください。

## 指示
- テーマ: ${THEME:-"全社経営戦略"}
- 対象期間: ${PERIOD:-"次の6ヶ月"}
- テンプレート（templates/strategy.md）の構造に従って出力してください
- プレースホルダー（{{...}}）を全て具体的な内容に置き換えてください
- PEST分析、5Forces分析、SWOT分析を必ず含めてください
- KPIは定量的で測定可能なものを設定してください
- 実行ロードマップは3フェーズで構成してください

## 利用可能なデータ
PROMPT

    if [ -n "$market_files" ]; then
        echo "### 市場データ"
        echo "$market_files" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
        echo ""
        echo "上記ファイルの内容を参照して分析してください。"
    else
        echo "### 市場データ"
        echo "※ data/market/ にデータがありません。一般的な市場動向に基づいて分析してください。"
    fi
    echo ""

    if [ -n "$internal_files" ]; then
        echo "### 社内データ"
        echo "$internal_files" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
    else
        echo "### 社内データ"
        echo "※ data/reports/ にデータがありません。一般的なスタートアップの状況を想定してください。"
    fi
    echo ""

    if [ -n "$minutes_files" ]; then
        echo "### 議事録データ"
        echo "$minutes_files" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
    fi
}

# --- 実行 ---
main() {
    log "=== OpenHeart 経営戦略立案 開始 ==="
    log "テーマ: ${THEME:-全社経営戦略}"
    log "対象期間: ${PERIOD:-次の6ヶ月}"

    # データ収集
    market_files=$(collect_market_data)
    internal_files=$(collect_internal_data)
    minutes_files=$(collect_minutes_data)

    # プロンプト構築
    local prompt_file="$PROJECT_ROOT/actions/${TIMESTAMP}_strategy_prompt.md"
    build_prompt "$market_files" "$internal_files" "$minutes_files" > "$prompt_file"
    log "プロンプトを生成: $prompt_file"

    # 出力先
    local output_file="$PROJECT_ROOT/strategies/${DATE}_strategy.md"

    # Claude Code呼び出し（claude CLIが利用可能な場合）
    if command -v claude &> /dev/null; then
        log "Claude Codeで戦略文書を生成中..."
        claude -p "$(cat "$prompt_file")" \
            --output "$output_file" \
            2>/dev/null || {
            log "Claude CLI実行に失敗。プロンプトファイルを確認してください: $prompt_file"
            log "手動実行: claude -p \"\$(cat $prompt_file)\" > $output_file"
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

    log "戦略文書を生成完了: $output_file"

    # TASKS.md更新
    update_tasks "戦略文書生成" "$output_file"

    # summary.md更新
    update_summary "戦略文書" "$output_file"

    log "=== 経営戦略立案 完了 ==="
}

update_tasks() {
    local task_name="$1"
    local output="$2"
    local tasks_file="$PROJECT_ROOT/TASKS.md"

    if [ -f "$tasks_file" ]; then
        local task_id="T-$(date +%s | tail -c 4)"
        local new_row="| $task_id | $task_name | completed | system | - | $DATE |"
        sed -i "/^| T-/a $new_row" "$tasks_file" 2>/dev/null || true
    fi
}

update_summary() {
    local doc_type="$1"
    local output="$2"
    local summary_file="$PROJECT_ROOT/summary.md"

    if [ -f "$summary_file" ]; then
        local filename
        filename=$(basename "$output")
        local new_row="| $DATE | $filename | $doc_type | $output |"
        # 成果物一覧テーブルに追記
        if grep -q "^| 日付 | 成果物" "$summary_file"; then
            sed -i "/^| [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} .* | .*$/a $new_row" "$summary_file" 2>/dev/null || true
        fi
        # 最終更新日を更新
        sed -i "s/^\*\*最終更新\*\*:.*/\*\*最終更新\*\*: $DATE/" "$summary_file" 2>/dev/null || true
        log "summary.md を更新しました"
    fi
}

main "$@"
