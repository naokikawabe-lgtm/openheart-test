# OpenHeart Business Automation Project

## Overview
OpenHeartの経営業務（戦略立案・顧客提案・情報収集）をClaude Codeベースで自動化するプロジェクト。
プロジェクトフォルダ起点で全情報をMarkdownに集約し、再利用可能な形で管理する。

## Project Structure
```
openheart-test/
├── CLAUDE.md              # このファイル（プロジェクトルール）
├── TASKS.md               # タスク管理（自動更新）
├── ACTIONS.json            # 承認済みアクション定義
├── scripts/               # 自動化スクリプト群
│   ├── strategy.sh        # 戦略立案の実行
│   ├── proposal.sh        # 提案資料の生成
│   ├── research.sh        # 市場調査・情報収集
│   └── minutes.sh         # 議事録整理
├── templates/             # テンプレート群
│   ├── strategy.md        # 戦略立案テンプレート
│   ├── proposal.md        # 提案資料テンプレート
│   └── minutes.md         # 議事録テンプレート
├── data/                  # 入力データ格納
│   ├── market/            # 市場データ・業界レポート
│   ├── clients/           # 顧客情報
│   ├── minutes/           # 会議の文字起こし・メモ
│   └── reports/           # 社内レポート・検証メモ
├── strategies/            # 生成された戦略文書
├── proposals/             # 生成された提案資料
└── actions/               # 実行ログ・履歴
```

## Rules
- 全ての出力はMarkdown形式で `strategies/` または `proposals/` に保存する
- データソースは必ず `data/` 配下に格納してから処理する
- 生成物には必ず日付プレフィックス（YYYY-MM-DD）を付与する
- 戦略文書には必ず「現状分析」「課題」「施策」「KPI」を含める
- 提案資料には必ず「背景」「提案内容」「期待効果」「スケジュール」「費用」を含める

## Skills Usage
- `strategy` : 戦略立案を実行（市場データ＋社内データ → 戦略文書）
- `proposal` : 提案資料を生成（顧客情報＋戦略 → 提案資料）
- `research` : 市場調査・競合分析を実行
- `minutes`  : 議事録の整理・要約・アクションアイテム抽出

## Automation Flow
1. `data/` にインプット情報を配置
2. `scripts/` のスクリプトでClaude Codeを呼び出し
3. `templates/` をベースに文書を自動生成
4. `strategies/` or `proposals/` に出力を保存
5. `TASKS.md` と `ACTIONS.json` を自動更新
