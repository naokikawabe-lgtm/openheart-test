#!/bin/bash
# OpenHeart Daily Report Auto-Trigger Hook
# セッション開始時に「今日のレポートが未実行」なら、トリガーファイルを作成する

set -euo pipefail

PROJECT_DIR="/home/user/openheart-test"
TODAY=$(TZ=Asia/Tokyo date +%Y-%m-%d)
LAST_REPORT_FILE="$PROJECT_DIR/.last-report-date"
TRIGGER_FILE="$PROJECT_DIR/.daily-report-trigger"

# 今日すでにレポートを実行済みなら何もしない
LAST_DATE=$(cat "$LAST_REPORT_FILE" 2>/dev/null || echo "")
if [ "$LAST_DATE" = "$TODAY" ]; then
  exit 0
fi

# トリガーファイルを作成（Claudeが読んで実行する）
cat > "$TRIGGER_FILE" << EOF
DAILY_REPORT_TRIGGER
date: $TODAY
created: $(TZ=Asia/Tokyo date "+%Y-%m-%d %H:%M JST")
EOF

exit 0
