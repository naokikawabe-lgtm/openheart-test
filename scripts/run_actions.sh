#!/usr/bin/env bash
# OpenHeart アクション自動実行エンジン
# ACTIONS.json に定義された approved アクションを実行する
#
# 使い方:
#   ./scripts/run_actions.sh              # 全approved アクションを実行
#   ./scripts/run_actions.sh daily        # dailyスケジュールのみ実行
#   ./scripts/run_actions.sh on-demand    # on-demandのみ実行
#   ./scripts/run_actions.sh --list       # アクション一覧を表示

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACTIONS_FILE="$PROJECT_ROOT/ACTIONS.json"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/actions/${TIMESTAMP}_execution.log"

SCHEDULE_FILTER="${1:-all}"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

# --- アクション一覧表示 ---
list_actions() {
    echo "=== OpenHeart 登録済みアクション ==="
    echo ""
    if command -v python3 &> /dev/null; then
        python3 -c "
import json
with open('$ACTIONS_FILE') as f:
    data = json.load(f)
print(f'最終更新: {data[\"lastUpdated\"]}')
print()
print(f'{\"ID\":<12} {\"名前\":<25} {\"スケジュール\":<12} {\"ステータス\":<10}')
print('-' * 60)
for a in data['actions']:
    print(f'{a[\"id\"]:<12} {a[\"name\"]:<25} {a[\"schedule\"]:<12} {a[\"status\"]:<10}')
"
    else
        cat "$ACTIONS_FILE"
    fi
}

# --- アクション実行 ---
execute_actions() {
    local filter="$1"

    if [ ! -f "$ACTIONS_FILE" ]; then
        log "エラー: ACTIONS.json が見つかりません"
        return 1
    fi

    log "=== アクション実行開始 (フィルタ: $filter) ==="

    # Python3でJSONパース
    if ! command -v python3 &> /dev/null; then
        log "エラー: python3 が必要です"
        return 1
    fi

    local actions_to_run
    actions_to_run=$(python3 -c "
import json
with open('$ACTIONS_FILE') as f:
    data = json.load(f)
for a in data['actions']:
    if a['status'] == 'approved':
        if '$filter' == 'all' or a['schedule'] == '$filter':
            print(f'{a[\"id\"]}|{a[\"name\"]}|{a[\"script\"]}|{a[\"description\"]}')
")

    if [ -z "$actions_to_run" ]; then
        log "実行対象のアクションがありません"
        return 0
    fi

    local success_count=0
    local fail_count=0

    echo "$actions_to_run" | while IFS='|' read -r id name script description; do
        log "--- [$id] $name 実行開始 ---"
        log "説明: $description"
        log "スクリプト: $script"

        local script_path="$PROJECT_ROOT/$script"
        if [ -x "$script_path" ]; then
            if "$script_path" >> "$LOG_FILE" 2>&1; then
                log "[$id] $name: 成功"
                success_count=$((success_count + 1))
            else
                log "[$id] $name: 失敗 (exit code: $?)"
                fail_count=$((fail_count + 1))
            fi
        else
            log "[$id] $name: スクリプトが見つかりません: $script_path"
            fail_count=$((fail_count + 1))
        fi
    done

    log "=== 実行完了 (成功: $success_count, 失敗: $fail_count) ==="
    log "ログ: $LOG_FILE"

    # TASKS.md 更新
    update_tasks_summary
}

# --- TASKS.md 更新 ---
update_tasks_summary() {
    local tasks_file="$PROJECT_ROOT/TASKS.md"
    if [ -f "$tasks_file" ]; then
        log "TASKS.md を更新中..."
        # 最終実行日時を記録
        if grep -q "^## Last Execution" "$tasks_file"; then
            sed -i "s/^## Last Execution.*/## Last Execution: $DATE $TIMESTAMP/" "$tasks_file"
        else
            echo "" >> "$tasks_file"
            echo "## Last Execution: $DATE $TIMESTAMP" >> "$tasks_file"
        fi
    fi
}

# --- メイン ---
main() {
    mkdir -p "$PROJECT_ROOT/actions"

    if [ "$SCHEDULE_FILTER" = "--list" ]; then
        list_actions
        return 0
    fi

    execute_actions "$SCHEDULE_FILTER"
}

main "$@"
