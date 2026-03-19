# OpenHeart Business Automation

OpenHeartの経営業務を自動化するClaude Codeベースのフレームワーク。
戦略立案、顧客提案資料作成、市場調査、議事録整理をプロジェクトフォルダ起点で一元管理します。

## 概要

プロジェクトフォルダ内に全情報をMarkdownで集約し、Claude Codeを活用して以下の業務を自動化します:

- **経営戦略立案**: 市場データ＋社内データ → PEST/SWOT/5Forces分析付き戦略文書
- **顧客提案資料**: 顧客情報＋戦略 → カスタマイズされた提案書
- **市場調査・競合分析**: テーマ指定 → 構造化された調査レポート
- **議事録整理**: 会議メモ・文字起こし → 構造化議事録＋アクションアイテム

## クイックスタート

### 1. 戦略立案
```bash
./scripts/strategy.sh "AI事業の拡大戦略" "2026年度下半期"
```

### 2. 提案資料生成
```bash
./scripts/proposal.sh "株式会社ABC" "DX推進コンサルティング"
```

### 3. 市場調査
```bash
./scripts/research.sh "AI SaaS市場の動向" "IT"
```

### 4. 議事録整理
```bash
./scripts/minutes.sh data/minutes/meeting_notes.txt
```

### 5. 登録アクションの一括実行
```bash
./scripts/run_actions.sh          # 全アクション実行
./scripts/run_actions.sh daily    # 日次アクションのみ
./scripts/run_actions.sh --list   # 一覧表示
```

## プロジェクト構成

```
.
├── CLAUDE.md              # プロジェクトルール・設定
├── TASKS.md               # タスク管理（自動更新）
├── ACTIONS.json            # アクション定義（承認・スケジュール管理）
├── scripts/
│   ├── strategy.sh        # 戦略立案スクリプト
│   ├── proposal.sh        # 提案資料生成スクリプト
│   ├── research.sh        # 市場調査スクリプト
│   ├── minutes.sh         # 議事録整理スクリプト
│   └── run_actions.sh     # アクション一括実行エンジン
├── templates/
│   ├── strategy.md        # 戦略書テンプレート（PEST/SWOT/5Forces）
│   ├── proposal.md        # 提案書テンプレート
│   └── minutes.md         # 議事録テンプレート
├── data/
│   ├── market/            # 市場データ・業界レポート
│   ├── clients/           # 顧客情報
│   ├── minutes/           # 会議の文字起こし・メモ
│   └── reports/           # 社内レポート
├── strategies/            # 生成された戦略文書
├── proposals/             # 生成された提案資料
└── actions/               # 実行ログ・プロンプト履歴
```

## ワークフロー

```
1. data/ にインプット情報を配置
       ↓
2. scripts/ で自動化スクリプトを実行
       ↓
3. templates/ をベースにClaude Codeが文書を生成
       ↓
4. strategies/ or proposals/ に出力を保存
       ↓
5. TASKS.md / ACTIONS.json が自動更新
```

## ACTIONS.json による自動化管理

`ACTIONS.json` にアクションを定義し、`run_actions.sh` で一括実行できます:

| アクション | スケジュール | 説明 |
|-----------|------------|------|
| daily-market-research | daily | 毎日の市場動向収集 |
| strategy-generation | on-demand | 経営戦略文書の生成 |
| proposal-generation | on-demand | 顧客提案資料の生成 |
| minutes-processing | on-demand | 議事録の整理・要約 |

## データの追加方法

### 市場データ
`data/market/` にMarkdown/テキスト/CSVファイルを配置

### 顧客情報
`data/clients/` に顧客ごとのMarkdownファイルを配置

### 会議メモ
`data/minutes/` にテキストファイルを配置（文字起こしデータ等）

### 社内レポート
`data/reports/` にMarkdownファイルを配置
