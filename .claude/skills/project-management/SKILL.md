# プロジェクト管理スキル

## いつ使うか
- 案件の進捗確認・状況把握を行うとき
- 議事録の作成・整理を行うとき
- タスク管理・アクションアイテムの追跡を行うとき
- summary.md の更新が必要なとき

## 何をするか
Gitリポジトリをプロジェクト管理の基盤として使い、
案件情報・議事録・成果物・タスクを一元管理する。

## 何ができるか
- summary.md を中心とした案件状況の把握と更新
- 議事録の構造化と決定事項・アクションアイテムの抽出
- meetings/、research/、deliverables/ の情報を横断的に参照
- TASKS.md / ACTIONS.json の自動更新
- MCP経由で外部サービス（Slack, Gmail, Notion）の情報を集約

## 運用原則
- summary.md が案件の「Single Source of Truth」
- 何か聞かれたら、まず summary.md を読んで全体を把握する
- 成果物の生成・更新時は summary.md も合わせて更新する
- 全ての変更はGitコミットで記録し、変更履歴を追跡可能にする

## 関連ファイル
- `meeting-facilitation.md` — 会議運営・議事録のベストプラクティス
