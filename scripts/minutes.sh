#!/usr/bin/env bash
# OpenHeart 議事録整理 自動化スクリプト
# 使い方: ./scripts/minutes.sh [入力ファイル]
#
# 例:
#   ./scripts/minutes.sh data/minutes/raw_meeting_notes.txt
#   ./scripts/minutes.sh  # data/minutes/ 内の未処理ファイルを自動検出

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

INPUT_FILE="${1:-}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- 未処理ファイルの検出 ---
find_unprocessed() {
    local minutes_dir="$PROJECT_ROOT/data/minutes"
    if [ -d "$minutes_dir" ]; then
        # _processed サフィックスがないファイルを検出
        find "$minutes_dir" -name "*.txt" -o -name "*.md" | while read -r f; do
            local basename=$(basename "$f" | sed 's/\.[^.]*$//')
            if ! echo "$basename" | grep -q "_processed$"; then
                echo "$f"
            fi
        done | head -10
    fi
}

# --- プロンプト構築 ---
build_prompt() {
    local input="$1"

    cat <<PROMPT
あなたはOpenHeart株式会社のPMアシスタントです。
以下の会議メモ・文字起こしデータを整理し、構造化された議事録を作成してください。

## 指示
- テンプレート（templates/minutes.md）の構造に従って出力してください
- プレースホルダー（{{...}}）を全て具体的な内容に置き換えてください
- 以下を必ず抽出・整理してください:
  1. 議題ごとの議論内容の要約
  2. 各議題の決定事項
  3. アクションアイテム（担当者・期限付き）
  4. 全体の要約（エグゼクティブサマリー）
- 話者が特定できる場合は発言者を明記してください
- 曖昧な点はそのまま記録し、「要確認」タグを付けてください

## 入力データ
PROMPT

    if [ -f "$input" ]; then
        echo '```'
        cat "$input"
        echo '```'
    else
        echo "※ 入力ファイルが指定されていません。"
        echo "使い方: ./scripts/minutes.sh [入力ファイルパス]"
    fi
}

# --- 実行 ---
main() {
    log "=== OpenHeart 議事録整理 開始 ==="

    # 入力ファイルの決定
    if [ -z "$INPUT_FILE" ]; then
        log "未処理の議事録を検索中..."
        local unprocessed=$(find_unprocessed)
        if [ -z "$unprocessed" ]; then
            log "未処理の議事録がありません。"
            log "使い方: ./scripts/minutes.sh [入力ファイルパス]"
            log "または data/minutes/ にテキストファイルを配置してください。"
            return 0
        fi
        INPUT_FILE=$(echo "$unprocessed" | head -1)
        log "検出した未処理ファイル: $INPUT_FILE"
    fi

    if [ ! -f "$INPUT_FILE" ]; then
        log "エラー: ファイルが見つかりません: $INPUT_FILE"
        return 1
    fi

    log "入力ファイル: $INPUT_FILE"

    # プロンプト構築
    local prompt_file="$PROJECT_ROOT/actions/${TIMESTAMP}_minutes_prompt.md"
    build_prompt "$INPUT_FILE" > "$prompt_file"
    log "プロンプトを生成: $prompt_file"

    # 出力先
    local input_basename=$(basename "$INPUT_FILE" | sed 's/\.[^.]*$//')
    local output_file="$PROJECT_ROOT/data/minutes/${DATE}_${input_basename}_processed.md"

    # Claude Code呼び出し
    if command -v claude &> /dev/null; then
        log "Claude Codeで議事録を整理中..."
        claude -p "$(cat "$prompt_file")" \
            --output "$output_file" \
            2>/dev/null || {
            log "Claude CLI実行に失敗。プロンプトファイル: $prompt_file"
            return 1
        }
    else
        log "Claude CLIが見つかりません。"
        log "プロンプトファイル: $prompt_file"
        log "出力先: $output_file"
        cat "$prompt_file"
        return 0
    fi

    log "議事録を整理完了: $output_file"
    log "=== 議事録整理 完了 ==="
}

main "$@"
