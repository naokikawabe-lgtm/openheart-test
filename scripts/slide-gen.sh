#!/usr/bin/env bash
# OpenHeart Markdown → PPTX 変換スクリプト
#
# 記事「Claude CodeとGitでコンサルの仕事を完結させる」の
# 提案スライド作成フロー（3ステップ）を自動化する。
#
# 使い方:
#   ./scripts/slide-gen.sh [Markdown構成ファイル] [テンプレートPPTX]
#
# 例:
#   ./scripts/slide-gen.sh deliverables/2026-03-19_提案資料.md templates/template.pptx
#   ./scripts/slide-gen.sh deliverables/2026-03-19_提案資料.md  # テンプレートなし

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

MD_FILE="${1:-}"
TEMPLATE_PPTX="${2:-}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ============================================================
# Step 1: Markdownの構成を検証する
# ============================================================
validate_markdown() {
    local md_file="$1"
    log "Step 1: Markdown構成を検証中..."

    if [ ! -f "$md_file" ]; then
        log "エラー: Markdownファイルが見つかりません: $md_file"
        return 1
    fi

    # スライド区切り（## で始まるセクション）を数える
    local slide_count
    slide_count=$(grep -c '^## ' "$md_file" || echo "0")
    log "  検出スライド数: $slide_count"

    # メッセージライン（主張）が各スライドにあるか確認
    local message_count
    message_count=$(grep -c '\*\*主張\*\*\|メッセージ\|主張:' "$md_file" || echo "0")
    log "  メッセージライン検出数: $message_count"

    if [ "$slide_count" -eq 0 ]; then
        log "警告: スライド区切り（## ）が見つかりません"
        log "  Markdownの各スライドは '## スライドN: タイトル' で区切ってください"
    fi

    log "  ストーリーライン検証: 人間が確認してください"
    log "  - 冒頭から結論まで1本のナラティブで貫いているか？"
    log "  - Why now, Why you が明確か？"
    log "  - メッセージラインだけ読んでストーリーが繋がるか？"

    echo "$slide_count"
}

# ============================================================
# Step 2: レイアウトパターンを選定する
# ============================================================
select_layouts() {
    local md_file="$1"
    log "Step 2: レイアウトパターンを選定中..."
    log "  .claude/skills/pptx/editing.md のレイアウトパターンを参照"

    # 各セクションの内容からレイアウトを推定
    local layout_file="$PROJECT_ROOT/actions/${TIMESTAMP}_layout_plan.md"

    cat > "$layout_file" <<'LAYOUT_PROMPT'
# スライドレイアウト計画

以下のMarkdown構成から、各スライドに最適なレイアウトパターンを選定してください。

## レイアウトパターン一覧
1. カバー（表紙） — タイトル・日付・宛先
2. アジェンダ — 目次・全体構成
3. セクションディバイダー — 章の切り替え
4. タイトル＋本文（1カラム） — 主張＋説明
5. タイトル＋2カラム — 比較・対比
6. タイトル＋箇条書き — ポイント列挙
7. タイトル＋表 — 構造化情報
8. タイトル＋図解（プロセス） — フロー・手順
9. タイトル＋図解（マトリクス） — 2軸分類
10. タイトル＋グラフ — データ視覚化
11. まとめ・Next Steps — 結論とアクション

## 入力Markdown
LAYOUT_PROMPT

    cat "$md_file" >> "$layout_file"

    log "  レイアウト計画を出力: $layout_file"
    log "  Claude CodeのPlan Modeで確認・調整してください"

    echo "$layout_file"
}

# ============================================================
# Step 3: PPTX を生成する
# ============================================================
generate_pptx() {
    local md_file="$1"
    local template="$2"
    local output_pptx

    local basename
    basename=$(basename "$md_file" .md)
    output_pptx="$PROJECT_ROOT/deliverables/${basename}.pptx"

    log "Step 3: PPTX生成..."

    if [ -n "$template" ] && [ -f "$template" ]; then
        log "  テンプレート: $template"
        log "  テンプレートのXMLを編集してスライドを生成します"

        # テンプレート展開用の一時ディレクトリ
        local work_dir="$PROJECT_ROOT/actions/${TIMESTAMP}_pptx_work"
        mkdir -p "$work_dir"

        # テンプレートを展開
        cp "$template" "$work_dir/template.zip"
        (cd "$work_dir" && unzip -q template.zip -d extracted/ 2>/dev/null) || {
            log "  テンプレートの展開に失敗しました"
            log "  Claude Codeに以下を依頼してください:"
            log "  「${md_file} の内容をもとに、テンプレートのXMLを編集してPPTXを生成してください」"
            return 1
        }

        log "  テンプレートを展開: $work_dir/extracted/"
        log "  XML編集はClaude Codeに依頼してください:"
        log "  「$work_dir/extracted/ のXMLを編集し、${md_file} の内容でスライドを生成してください」"
    else
        log "  テンプレートなし: Claude Codeで直接PPTX XMLを生成します"
        log "  Claude Codeに以下を依頼してください:"
        log "  「${md_file} の内容をもとにPPTXを生成してください」"
    fi

    log "  出力先: $output_pptx"

    # Claude Code呼び出し（CLI利用可能な場合）
    if command -v claude &> /dev/null; then
        log "  Claude Codeで生成中..."
        local prompt="以下のMarkdown構成をもとにPPTXを生成してください。
.claude/skills/pptx/ のスキルファイルを参照し、レイアウトパターンに従ってください。
生成後はサブエージェントでビジュアルQAを実行してください。
入力: ${md_file}
出力: ${output_pptx}"

        claude -p "$prompt" 2>/dev/null || {
            log "  Claude CLI実行に失敗。手動で実行してください。"
            return 1
        }
    else
        log "  Claude CLIが見つかりません。手動で実行してください。"
    fi

    echo "$output_pptx"
}

# ============================================================
# ビジュアルQA
# ============================================================
run_visual_qa() {
    local pptx_file="$1"
    log "ビジュアルQA実行..."
    log "  サブエージェントで以下をチェック:"
    log "  - テキスト切れ（ボックスからのはみ出し）"
    log "  - フォントの折り返し（意図しない改行）"
    log "  - レイアウト崩れ（位置ずれ・重なり）"
    log "  - テンプレートの消し残し（プレースホルダー残り）"
    log "  - 一貫性（フォントサイズ・色・マージン）"

    if [ -f "$pptx_file" ]; then
        log "  対象: $pptx_file"
        log "  Claude Codeに依頼: 「${pptx_file} のビジュアルQAを実行してください」"
    else
        log "  PPTXファイルがまだ生成されていません"
    fi
}

# ============================================================
# メイン
# ============================================================
main() {
    log "=== OpenHeart スライド生成パイプライン 開始 ==="

    if [ -z "$MD_FILE" ]; then
        log "使い方: ./scripts/slide-gen.sh [Markdown構成ファイル] [テンプレートPPTX(任意)]"
        log ""
        log "提案スライド作成の3ステップ:"
        log "  Step 1: Markdownでストーリーとメッセージラインを書く"
        log "  Step 2: Plan Modeでスライド構成を設計する"
        log "  Step 3: テンプレートのXMLを編集してPPTXを生成する"
        log ""
        log "例:"
        log "  ./scripts/slide-gen.sh deliverables/2026-03-19_提案資料.md"
        log "  ./scripts/slide-gen.sh deliverables/2026-03-19_提案資料.md templates/template.pptx"
        return 0
    fi

    mkdir -p "$PROJECT_ROOT/actions"

    # Step 1: Markdown検証
    local slide_count
    slide_count=$(validate_markdown "$MD_FILE")
    echo ""

    # Step 2: レイアウト選定
    local layout_file
    layout_file=$(select_layouts "$MD_FILE")
    echo ""

    # Step 3: PPTX生成
    local output
    output=$(generate_pptx "$MD_FILE" "${TEMPLATE_PPTX:-}")
    echo ""

    # QA
    run_visual_qa "${output:-}"

    log ""
    log "=== スライド生成パイプライン 完了 ==="
    log "次のアクション:"
    log "  1. レイアウト計画を確認: $layout_file"
    log "  2. Claude CodeでPPTXを生成・修正"
    log "  3. 生成→QA→修正のサイクルをGitで記録"
}

main "$@"
