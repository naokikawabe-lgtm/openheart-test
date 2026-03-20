# セッションログ: 2026-03-19〜03-20 Web版セッション

## セッションID
session_01NDSbbZiogBFZrexHpctZQX

## ブランチ
`claude/automate-business-strategy-jnNy2`

---

## セッション概要

本セッションでは、記事「Claude CodeとGitでコンサルの仕事を完結させる」に基づき、
OpenHeartのコンサルティング業務基盤を構築し、架空案件でフロー全体を実行した。

---

## 実施内容（時系列）

### 1. フレームワーク再構築（コミット: 199dac5）

記事の3テーマに完全準拠した業務自動化基盤を構築:

#### スキルファイルの作成
- `.claude/skills/pptx/SKILL.md` — PPTXスキル定義
- `.claude/skills/pptx/editing.md` — 11種レイアウトパターン、テンプレートXML編集手順、ビジュアルQA手順
- `.claude/skills/consulting/SKILL.md` — コンサル暗黙知スキル定義
- `.claude/skills/consulting/story-writing.md` — ストーリーライティング原則（Why now/Why you、課題解決型/機会提示型/報告型の3つの構成パターン）
- `.claude/skills/consulting/proposal-activity.md` — 提案活動の原則（売り込むな共創の相手になれ、5フェーズの提案プロセス）
- `.claude/skills/project-management/SKILL.md` — プロジェクト管理スキル定義
- `.claude/skills/project-management/meeting-facilitation.md` — 会議運営・議事録のベストプラクティス

#### リポジトリ構成の整備
- `summary.md` — 案件のSingle Source of Truth
- `meetings/`, `deliverables/`, `research/`, `sources/`, `assets/` — ディレクトリ構造
- `scripts/slide-gen.sh` — Markdown→PPTX変換パイプライン（新規作成）
- `templates/proposal.md` — メッセージライン確認用セクション付き提案テンプレート（全面改訂）
- `ACTIONS.json` — 5つの承認済みアクション定義（全面改訂）

#### スクリプトの更新
- `scripts/strategy.sh` — summary.md自動更新機能を追加
- `scripts/proposal.sh` — summary.md自動更新 + 次ステップ案内を追加
- `scripts/minutes.sh` — 出力先をmeetings/に変更 + summary.md自動更新を追加
- `README.md` — 記事の3テーマ構成に合わせて全面書き換え

### 2. 架空案件でコンサルティング業務を実行（コミット: b6c29bf）

テーマ: **中堅製造業「山田精密工業株式会社」向け DX推進コンサルティング**

#### 顧客設定
- 愛知県豊田市の自動車部品精密加工メーカー（従業員320名、売上85億円）
- EV化でエンジン部品の受注が年5〜8%減少
- 5年以内にベテラン職人10名以上が退職予定
- 設備稼働率68%（業界ベンチマーク80%以上）
- Accessベースの老朽化生産管理システム（2008年構築）
- IT担当は総務部の兼任1名のみ

#### 生成した成果物
1. **顧客情報** `data/clients/2026-03-15_山田精密工業.md`
   - 基本情報、ヒアリングメモ（社長の発言）、工場状況、組織体制、競合状況

2. **市場データ** `data/market/2026-03-19_製造業DX市場データ.md`
   - 製造業DX市場規模（2023-2030推移）、中堅製造業のDX実態調査、EV化の影響、スマートファクトリーの投資対効果

3. **戦略文書** `strategies/2026-03-19_山田精密工業_DX戦略.md`
   - PEST分析、5Forces分析、SWOT分析
   - 5つの重要課題を特定
   - 4つの施策を設計:
     - 施策1: IoTセンサー＋設備稼働監視（2,500万円）
     - 施策2: デジタル技能伝承システム（1,000万円）
     - 施策3: EV部品試作ライン（1,500万円）
     - 施策4: DX推進体制の構築（2,500万円）
   - KPI 6項目、3フェーズのロードマップ（18ヶ月）、リスク対策
   - 総投資7,500万円、補助金活用で実質4,500万円

4. **提案資料（Markdown構成案）** `deliverables/2026-03-19_山田精密工業_DX推進提案資料.md`
   - 10スライド構成（Step 1完了）
   - ストーリーライティングスキルの「課題解決型」構成を適用
   - 各スライドに「主張（メッセージライン）」を明記
   - 末尾にメッセージライン確認用セクション — ストーリーチェック全項目クリア

5. **summary.md** — 案件の最新状態に更新
   - ステータス: 提案準備中
   - ToDo 7項目を設定（工場見学、PPTX化、ベンダー選定、補助金申請等）

#### 適用したスキル
- **ストーリーライティング（story-writing.md）**: 課題解決型の構成パターンを適用。Why now/Why youを軸に全スライドのメッセージラインを設計
- **提案活動の原則（proposal-activity.md）**: ソリューション押し売りではなく顧客課題の構造分析から出発。定量データで根拠を明示
- **プロジェクト管理（meeting-facilitation.md）**: summary.mdをSingle Source of Truthとして運用

---

## 未完了タスク（VS Code側で継続）

| No. | タスク | 備考 |
|-----|--------|------|
| 1 | 提案資料のPPTX化（Step 2: レイアウト設計 → Step 3: PPTX生成） | PPTXテンプレートの準備が前提 |
| 2 | 工場見学後のヒアリング結果反映 | 架空案件のため任意 |
| 3 | IoTベンダー候補の調査 | research/ に出力 |
| 4 | MCP経由のサービス連携設定 | Slack, Gmail, Notion |

---

## VS Code移行手順

```bash
# 1. リポジトリをクローンまたはブランチを取得
git fetch origin claude/automate-business-strategy-jnNy2
git checkout claude/automate-business-strategy-jnNy2

# 2. VS CodeでClaude Codeを起動
# CLAUDE.mdが自動で読み込まれ、スキルファイルも参照可能になる

# 3. このセッションログを参照させる
# 「actions/session-log.md を読んで、前回のセッションの続きから作業してください」
```
