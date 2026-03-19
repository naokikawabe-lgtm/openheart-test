# OpenHeart コンサルティング業務基盤

Claude CodeとGitでコンサルティング業務を完結させるためのフレームワーク。

提案資料の作成、暗黙知のスキル化、案件情報の管理を一続きに扱います。

## 3つのテーマ

### 1. 提案スライドをClaude Codeで作る

考える作業と整形する作業を分離し、3ステップで進める:

```
Step 1: Markdownでストーリーとメッセージラインを書く
       → 資料の軸を先に固める（PowerPointはまだ触らない）

Step 2: Plan Modeでスライド構成を設計する
       → 11種のレイアウトパターンから逆引きで選定

Step 3: テンプレートのXMLを編集してPPTXを生成する
       → 生成→QA→修正のサイクルをGitで記録
```

```bash
# 提案資料のMarkdown構成を生成
./scripts/proposal.sh "株式会社ABC" "DX推進コンサルティング"

# Markdown → PPTX変換
./scripts/slide-gen.sh deliverables/2026-03-19_提案資料.md
```

### 2. コンサルの暗黙知をスキル化する

判断基準やベストプラクティスを `.claude/skills/` にスキルファイルとして配置。
AIが関連タスクを検出したときに自動で参照・適用する。

```
.claude/skills/
├── pptx/                    # スライド生成スキル
│   ├── SKILL.md             #   スキル定義（いつ・どう使うか）
│   └── editing.md           #   テンプレートからの編集手順
├── consulting/              # コンサルティング暗黙知
│   ├── SKILL.md
│   ├── story-writing.md     #   ストーリーライティング原則
│   └── proposal-activity.md #   提案活動の原則
└── project-management/      # プロジェクト管理
    ├── SKILL.md
    └── meeting-facilitation.md
```

**運用サイクル:** 作業 → 改善点を発見 → スキルに追記 → 次回から自動適用

### 3. Gitリポジトリでプロジェクトを管理する

案件情報をGitリポジトリに集約し、Claude Codeが文脈を保持して作業する。

- `summary.md` が案件の中心（Single Source of Truth）
- Claude Codeはセッション開始時に `CLAUDE.md` を自動読み込み
- MCP経由でSlack・Gmail・Notionの情報を `sources/` に集約

```
openheart-test/
├── CLAUDE.md              # AIへの指示書
├── summary.md             # 案件の全体像
├── meetings/              # 議事録
├── deliverables/          # 成果物（Markdown + PPTX）
├── research/              # 調査・分析
├── sources/               # 外部サービスから集約した情報
└── assets/                # 生データ（録音・文字起こし等）
```

## クイックスタート

```bash
# 経営戦略立案
./scripts/strategy.sh "AI事業の拡大戦略" "2026年度下半期"

# 提案資料生成（Markdown）
./scripts/proposal.sh "株式会社ABC" "基幹システム刷新"

# Markdown → PPTX変換
./scripts/slide-gen.sh proposals/2026-03-19_ABC.md

# 市場調査
./scripts/research.sh "AI SaaS市場の動向" "IT"

# 議事録整理
./scripts/minutes.sh assets/meeting_transcript.txt

# 登録アクションの一括実行
./scripts/run_actions.sh          # 全アクション
./scripts/run_actions.sh daily    # 日次のみ
./scripts/run_actions.sh --list   # 一覧表示
```

## 参考

- 「Claude CodeとGitでコンサルの仕事を完結させる」（@yusaku_0426）
- 「Claude Codeで開発プロジェクトのプロマネをぶん回す」（@gura105）
- Anthropic: "Eight Trends Defining How Software Gets Built in 2026"
