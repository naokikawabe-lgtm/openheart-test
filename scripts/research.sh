#!/usr/bin/env bash
# OpenHeart 市場調査・競合分析 自動化スクリプト
# 使い方: ./scripts/research.sh [調査テーマ] [業界]
#
# 例:
#   ./scripts/research.sh "AI SaaS市場の動向" "IT"
#   ./scripts/research.sh  # デフォルト: 全般的な市場動向

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

TOPIC="${1:-市場動向の調査}"
INDUSTRY="${2:-}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- 既存データの確認 ---
check_existing_research() {
    log "既存の調査データを確認中..."
    local market_dir="$PROJECT_ROOT/data/market"
    if [ -d "$market_dir" ] && [ "$(ls -A "$market_dir" 2>/dev/null)" ]; then
        find "$market_dir" -name "*.md" -newer "$market_dir" -mtime -7 2>/dev/null | head -5
    fi
}

# --- プロンプト構築 ---
build_prompt() {
    local existing_data="$1"

    cat <<PROMPT
あなたはOpenHeart株式会社の市場調査アナリストです。
以下のテーマについて調査レポートを作成してください。

## 指示
- 調査テーマ: ${TOPIC}
- 対象業界: ${INDUSTRY:-"OpenHeartの事業領域全般"}
- 以下の構造で出力してください:

# 市場調査レポート: ${TOPIC}
**調査日**: ${DATE}

## 1. 市場概況
- 市場規模と成長率
- 主要トレンド

## 2. 競合分析
- 主要プレイヤーとポジショニング
- 各社の強み・弱み
- 競合の最新動向

## 3. 技術トレンド
- 注目技術・手法
- 今後の技術展望

## 4. 顧客動向
- 顧客ニーズの変化
- 購買行動の傾向

## 5. 機会とリスク
- OpenHeartにとっての事業機会
- 注意すべきリスク

## 6. 推奨アクション
- 短期（1-3ヶ月）
- 中期（3-6ヶ月）
- 長期（6ヶ月以上）

## 注意事項
- データは可能な限り定量的に記述してください
- 出典や根拠を明記してください
- 不確実な情報は推定であることを明示してください
PROMPT

    if [ -n "$existing_data" ]; then
        echo ""
        echo "## 参考: 過去の調査データ"
        echo "$existing_data" | while read -r f; do
            [ -n "$f" ] && echo "- $f"
        done
    fi
}

# --- 実行 ---
main() {
    log "=== OpenHeart 市場調査 開始 ==="
    log "テーマ: $TOPIC"
    log "業界: ${INDUSTRY:-全般}"

    existing_data=$(check_existing_research)

    # プロンプト構築
    local prompt_file="$PROJECT_ROOT/actions/${TIMESTAMP}_research_prompt.md"
    build_prompt "$existing_data" > "$prompt_file"
    log "プロンプトを生成: $prompt_file"

    # 出力先
    local safe_topic=$(echo "$TOPIC" | tr ' ' '_' | tr -cd 'a-zA-Z0-9_-' | head -c 50)
    local output_file="$PROJECT_ROOT/data/market/${DATE}_${safe_topic}.md"

    # Claude Code呼び出し
    if command -v claude &> /dev/null; then
        log "Claude Codeで調査レポートを生成中..."
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

    log "調査レポートを生成完了: $output_file"
    log "=== 市場調査 完了 ==="
}

main "$@"
